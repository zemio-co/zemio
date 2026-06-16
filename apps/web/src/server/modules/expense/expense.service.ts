import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { ExpenseType, ReportStatus } from "@zemio/db";
import type { z } from "zod";
import type {
	createFoodExpenseSchema,
	createReceiptExpenseSchema,
	createTravelExpenseSchema,
} from "@/lib/validators";
import {
	foodExpenseMetaSchema,
	travelExpenseMetaSchema,
} from "@/lib/validators";
import { mapPrismaError } from "@/server/shared/errors";
import { deleteFilesFromStorage } from "@/server/storage";
import {
	type ExpenseByIdDTO,
	type ExpenseListItemDTO,
	toExpenseByIdDTO,
	toExpenseListItemDTO,
} from "./expense.dto";
import { authorizeExpense, type ExpensePolicyContext } from "./expense.policy";
import {
	type ExpenseDetail,
	type ExpenseRepository,
	expenseRepository,
} from "./expense.repository";

async function runWrite<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
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
};

export function createExpenseService(deps: { repo: ExpenseRepository }) {
	const { repo } = deps;

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

	function assertOwner(
		ctx: ExpenseServiceContext,
		report: { ownerId: string },
	): void {
		if (report.ownerId !== ctx.userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to modify this report's expenses",
			});
		}
	}

	function assertEditable(report: { status: ReportStatus }): void {
		if (
			report.status !== ReportStatus.DRAFT &&
			report.status !== ReportStatus.NEEDS_REVISION
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "You can only add expenses to draft or needs revision reports",
			});
		}
	}

	return {
		async list(
			ctx: ExpenseServiceContext,
			input: { reportId: string },
		): Promise<ExpenseListItemDTO[]> {
			const report = await loadReport(ctx, input.reportId);
			authorizeExpense("read", toPolicyContext(ctx), { report });
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
			assertOwner(ctx, report);
			assertEditable(report);

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

			return runWrite(() =>
				repo.create(ctx.db, {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.RECEIPT,
					amount: input.amount,
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					meta: {},
					attachments: {
						createMany: {
							data: input.attachments.map((a) => ({
								key: a.key,
								size: a.size,
								originalName: a.originalName,
							})),
						},
					},
				}),
			);
		},

		async createTravel(
			ctx: ExpenseServiceContext,
			input: CreateTravelInput,
		): Promise<{ id: string }> {
			const report = await loadReport(ctx, input.reportId);
			assertOwner(ctx, report);
			assertEditable(report);

			const settings = await repo.findSettings(ctx.db, ctx.organizationId);
			if (!settings) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "App settings have not been set up correctly",
				});
			}

			return runWrite(() =>
				repo.create(ctx.db, {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.TRAVEL,
					amount: Number(input.distance) * Number(settings.kilometerRate),
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					meta: { from: input.from, to: input.to, distance: input.distance },
				}),
			);
		},

		async createFood(
			ctx: ExpenseServiceContext,
			input: CreateFoodInput,
		): Promise<{ id: string }> {
			const report = await loadReport(ctx, input.reportId);
			assertOwner(ctx, report);
			assertEditable(report);

			return runWrite(() =>
				repo.create(ctx.db, {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.FOOD,
					amount: input.amount,
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					meta: {
						days: input.days,
						breakfastDeduction: input.breakfastDeduction,
						lunchDeduction: input.lunchDeduction,
						dinnerDeduction: input.dinnerDeduction,
					},
				}),
			);
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

			// biome-ignore lint/suspicious/noExplicitAny: Prisma.ExpenseUpdateInput meta accepts any JSON-compatible shape
			const updateData: Record<string, any> = { ...baseData };

			if (expense.type === ExpenseType.TRAVEL) {
				const currentMeta = travelExpenseMetaSchema.safeParse(expense.meta);
				const currentMetaData = currentMeta.success
					? currentMeta.data
					: { from: "", to: "", distance: 0 };

				if (from !== undefined || to !== undefined || distance !== undefined) {
					updateData.meta = {
						from: from ?? currentMetaData.from,
						to: to ?? currentMetaData.to,
						distance: distance ?? currentMetaData.distance,
					};
				}

				if (distance !== undefined) {
					const settings = await repo.findSettings(ctx.db, ctx.organizationId);
					const kilometerRate = settings?.kilometerRate ?? 0.3;
					updateData.amount = Number(distance) * Number(kilometerRate);
				}
			}

			if (expense.type === ExpenseType.FOOD) {
				const currentMeta = foodExpenseMetaSchema.safeParse(expense.meta);
				const currentMetaData = currentMeta.success
					? currentMeta.data
					: {
							days: 1,
							breakfastDeduction: 0,
							lunchDeduction: 0,
							dinnerDeduction: 0,
						};

				if (
					days !== undefined ||
					breakfastDeduction !== undefined ||
					lunchDeduction !== undefined ||
					dinnerDeduction !== undefined
				) {
					updateData.meta = {
						days: days ?? currentMetaData.days,
						breakfastDeduction:
							breakfastDeduction ?? currentMetaData.breakfastDeduction,
						lunchDeduction: lunchDeduction ?? currentMetaData.lunchDeduction,
						dinnerDeduction: dinnerDeduction ?? currentMetaData.dinnerDeduction,
					};
				}
			}

			return runWrite(() =>
				repo.update(ctx.db, { id: expense.id, data: updateData }),
			);
		},

		async remove(
			ctx: ExpenseServiceContext,
			expense: ExpenseDetail,
		): Promise<{ id: string }> {
			const keys = await repo.findAttachmentKeys(ctx.db, expense.id);
			if (keys.length > 0) {
				await deleteFilesFromStorage(keys);
			}
			return runWrite(() => repo.remove(ctx.db, expense.id));
		},
	};
}

export type ExpenseService = ReturnType<typeof createExpenseService>;

export const expenseService = createExpenseService({ repo: expenseRepository });
