import { TRPCError } from "@trpc/server";
import {
	ExpenseType,
	type InputTaxRate,
	type Prisma,
	type PrismaClient,
} from "@zemio/db";
import type { z } from "zod";
import { roundToCents } from "@/lib/utils";
// Typed from the schemas the router actually validates with, not from the
// identical copies in `@/lib/validators` that shape the forms: those can drift,
// and this service's input types would then describe a shape it never receives.
import { type AuditRepository, auditRepository } from "@/server/modules/audit";
import { mapPrismaError } from "@/server/shared/errors";
import { decimalToNumber } from "@/server/shared/money";
import { deleteFilesFromStorage } from "@/server/storage";
import {
	type ExpenseByIdDTO,
	type ExpenseListItemDTO,
	toExpenseByIdDTO,
	toExpenseListItemDTO,
} from "./expense.dto";
import { foodDetailFromMeta, travelDetailFromMeta } from "./expense.meta";
import { type ExpensePolicyContext, expensePolicy } from "./expense.policy";
import {
	type ExpenseDetail,
	type ExpenseRepository,
	expenseRepository,
} from "./expense.repository";
import type {
	createFoodExpenseSchema,
	createReceiptExpenseSchema,
	createTravelExpenseSchema,
} from "./expense.validators";

async function runWrite<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw mapPrismaError(error);
	}
}

async function transact<T>(
	db: PrismaClient,
	fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
	try {
		return await db.$transaction((tx) => fn(tx as unknown as PrismaClient));
	} catch (error) {
		throw mapPrismaError(error);
	}
}

export type ExpenseServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
	isOrgAdmin: boolean;
};

type CreateReceiptInput = z.infer<typeof createReceiptExpenseSchema>;
type CreateTravelInput = z.infer<typeof createTravelExpenseSchema>;
type CreateFoodInput = z.infer<typeof createFoodExpenseSchema>;

type UpdateExpenseInput = {
	description?: string;
	amount?: number;
	startDate?: Date;
	endDate?: Date;
	from?: string;
	to?: string;
	distance?: number;
	days?: number;
	breakfastDeduction?: number;
	lunchDeduction?: number;
	dinnerDeduction?: number;
	inputTaxRate?: InputTaxRate;
};

export function createExpenseService(deps: {
	repo: ExpenseRepository;
	audit: AuditRepository;
}) {
	const { repo, audit } = deps;

	function toPolicyContext(ctx: ExpenseServiceContext): ExpensePolicyContext {
		return { userId: ctx.userId, isOrgAdmin: ctx.isOrgAdmin };
	}

	async function loadReport(ctx: ExpenseServiceContext, reportId: string) {
		const report = await repo.findReport(ctx.db, {
			id: reportId,
			organizationId: ctx.organizationId,
		});
		if (!report) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
		}
		return report;
	}

	return {
		async list(
			ctx: ExpenseServiceContext,
			input: { reportId: string },
		): Promise<ExpenseListItemDTO[]> {
			const report = await loadReport(ctx, input.reportId);
			expensePolicy.authorize("read", toPolicyContext(ctx), { report });
			const expenses = await repo.listForReport(ctx.db, input.reportId);
			return expenses.map(toExpenseListItemDTO);
		},

		byId(expense: ExpenseDetail): ExpenseByIdDTO {
			return toExpenseByIdDTO(expense);
		},

		async createReceipt(
			ctx: ExpenseServiceContext,
			input: CreateReceiptInput,
		): Promise<{ id: string }> {
			const report = await loadReport(ctx, input.reportId);
			expensePolicy.authorize("create", toPolicyContext(ctx), { report });

			const expectedKeyPrefix = `attachment/${ctx.organizationId}/`;
			const hasInvalidKey = input.attachments.some(
				(a) => !a.key.startsWith(expectedKeyPrefix),
			);
			if (hasInvalidKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "One or more attachment keys do not belong to this organization",
				});
			}

			return transact(ctx.db, async (db) => {
				const result = await repo.create(db, {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.RECEIPT,
					amount: input.amount,
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					// Only a receipt carries one; the two allowances leave it null.
					inputTaxRate: input.inputTaxRate,
					attachments: {
						createMany: {
							data: input.attachments.map((a) => ({
								key: a.key,
								size: a.size,
								originalName: a.originalName,
							})),
						},
					},
				});
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "expense",
					entityId: result.id,
					action: "expense.added",
					diff: null,
					payload: { type: "RECEIPT", reportId: input.reportId },
				});
				return result;
			});
		},

		async createTravel(
			ctx: ExpenseServiceContext,
			input: CreateTravelInput,
		): Promise<{ id: string }> {
			const report = await loadReport(ctx, input.reportId);
			expensePolicy.authorize("create", toPolicyContext(ctx), { report });

			const settings = await repo.findSettings(ctx.db, ctx.organizationId);
			if (!settings) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "App settings have not been set up correctly",
				});
			}

			return transact(ctx.db, async (db) => {
				const result = await repo.create(db, {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.TRAVEL,
					amount: roundToCents(
						Number(input.distance) * Number(settings.kilometerRate),
					),
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					travelDetail: {
						create: {
							from: input.from,
							to: input.to,
							distance: input.distance,
						},
					},
				});
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "expense",
					entityId: result.id,
					action: "expense.added",
					diff: null,
					payload: { type: "TRAVEL", reportId: input.reportId },
				});
				return result;
			});
		},

		async createFood(
			ctx: ExpenseServiceContext,
			input: CreateFoodInput,
		): Promise<{ id: string }> {
			const report = await loadReport(ctx, input.reportId);
			expensePolicy.authorize("create", toPolicyContext(ctx), { report });

			return transact(ctx.db, async (db) => {
				const result = await repo.create(db, {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.FOOD,
					amount: input.amount,
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					foodDetail: {
						create: {
							days: input.days,
							breakfastDeduction: input.breakfastDeduction,
							lunchDeduction: input.lunchDeduction,
							dinnerDeduction: input.dinnerDeduction,
						},
					},
				});
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "expense",
					entityId: result.id,
					action: "expense.added",
					diff: null,
					payload: { type: "FOOD", reportId: input.reportId },
				});
				return result;
			});
		},

		async update(
			ctx: ExpenseServiceContext,
			expense: ExpenseDetail,
			input: UpdateExpenseInput,
		): Promise<{ id: string }> {
			const {
				from,
				to,
				distance,
				days,
				breakfastDeduction,
				lunchDeduction,
				dinnerDeduction,
				...baseData
			} = input;

			const updateData: Prisma.ExpenseUpdateInput = { ...baseData };

			const before: Record<string, Prisma.InputJsonValue | null> = {};
			const after: Record<string, Prisma.InputJsonValue | null> = {};

			if (expense.type === ExpenseType.TRAVEL) {
				if (from !== undefined || to !== undefined || distance !== undefined) {
					// Legacy rows created during the migration deploy window have no
					// detail row yet; their current values live in the deprecated
					// meta column and must survive a partial update. The upsert then
					// creates the missing detail row.
					const current = expense.travelDetail
						? {
								from: expense.travelDetail.from,
								to: expense.travelDetail.to,
								distance: decimalToNumber(expense.travelDetail.distance),
							}
						: travelDetailFromMeta(expense.meta);
					const next = {
						from: from ?? current.from,
						to: to ?? current.to,
						distance: distance ?? current.distance,
					};
					updateData.travelDetail = { upsert: { create: next, update: next } };
					before.travelDetail = current;
					after.travelDetail = next;
				}

				if (distance !== undefined) {
					const settings = await repo.findSettings(ctx.db, ctx.organizationId);
					const kilometerRate = settings?.kilometerRate ?? 0.3;
					updateData.amount = roundToCents(Number(distance) * Number(kilometerRate));
				}
			}

			if (expense.type === ExpenseType.FOOD) {
				if (
					days !== undefined ||
					breakfastDeduction !== undefined ||
					lunchDeduction !== undefined ||
					dinnerDeduction !== undefined
				) {
					// Same deploy-window fallback as the travel branch above.
					const current = expense.foodDetail
						? {
								days: expense.foodDetail.days,
								breakfastDeduction: decimalToNumber(
									expense.foodDetail.breakfastDeduction,
								),
								lunchDeduction: decimalToNumber(expense.foodDetail.lunchDeduction),
								dinnerDeduction: decimalToNumber(expense.foodDetail.dinnerDeduction),
							}
						: foodDetailFromMeta(expense.meta);
					const next = {
						days: days ?? current.days,
						breakfastDeduction: breakfastDeduction ?? current.breakfastDeduction,
						lunchDeduction: lunchDeduction ?? current.lunchDeduction,
						dinnerDeduction: dinnerDeduction ?? current.dinnerDeduction,
					};
					updateData.foodDetail = { upsert: { create: next, update: next } };
					before.foodDetail = current;
					after.foodDetail = next;
				}
			}

			if (
				"description" in updateData &&
				updateData.description !== expense.description
			) {
				before.description = expense.description;
				after.description = updateData.description as string;
			}
			if ("amount" in updateData) {
				const prevAmount = Number(expense.amount);
				const nextAmount = Number(updateData.amount);
				if (prevAmount !== nextAmount) {
					before.amount = prevAmount;
					after.amount = nextAmount;
				}
			}

			if (Object.keys(before).length === 0) {
				return runWrite(() =>
					repo.update(ctx.db, { id: expense.id, data: updateData }),
				);
			}

			return transact(ctx.db, async (db) => {
				const result = await repo.update(db, { id: expense.id, data: updateData });
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "expense",
					entityId: expense.id,
					action: "expense.updated",
					diff: { before, after },
					payload: null,
				});
				return result;
			});
		},

		async remove(
			ctx: ExpenseServiceContext,
			expense: ExpenseDetail,
		): Promise<{ id: string }> {
			const keys = await repo.findAttachmentKeys(ctx.db, expense.id);
			if (keys.length > 0) {
				await deleteFilesFromStorage(keys);
			}
			return transact(ctx.db, async (db) => {
				const result = await repo.remove(db, expense.id);
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "expense",
					entityId: expense.id,
					action: "expense.deleted",
					diff: {
						before: {
							type: expense.type,
							amount: Number(expense.amount),
							description: expense.description ?? null,
						},
						after: null,
					},
					payload: null,
				});
				return result;
			});
		},
	};
}

export type ExpenseService = ReturnType<typeof createExpenseService>;

export const expenseService = createExpenseService({
	repo: expenseRepository,
	audit: auditRepository,
});
