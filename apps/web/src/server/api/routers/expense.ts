import { TRPCError } from "@trpc/server";
import type { Prisma } from "@zemio/db";
import { ExpenseType, ReportStatus } from "@zemio/db";
import { z } from "zod";
import { isOrganizationAdminRole } from "@/lib/organization";
import {
	createFoodExpenseSchema,
	createReceiptExpenseSchema,
	createTravelExpenseSchema,
	foodExpenseMetaSchema,
	receiptExpenseMetaSchema,
	travelExpenseMetaSchema,
} from "@/lib/validators";
import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";

export const expenseRouter = createTRPCRouter({
	listForReport: orgProcedure
		.input(z.object({ reportId: z.string() }))
		.query(async ({ ctx, input }) => {
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.reportId,
					organizationId: ctx.organizationId,
				},
				select: { ownerId: true },
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			const isAdmin = isOrganizationAdminRole(ctx.orgRole);
			if (!isAdmin && report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this report",
				});
			}

			const expenses = await ctx.db.expense.findMany({
				where: { reportId: input.reportId },
				include: {
					attachments: true,
				},
			});

			return expenses.map((expense) => ({
				...expense,
				amount: Number(expense.amount),
			}));
		}),
	// Get all expenses for a report
	getByReportId: orgProcedure
		.input(z.object({ reportId: z.string() }))
		.query(async ({ ctx, input }) => {
			// First check if user owns the report
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.reportId,
					organizationId: ctx.organizationId,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			const isAdmin = isOrganizationAdminRole(ctx.orgRole);
			if (!isAdmin && report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this report",
				});
			}

			return ctx.db.expense.findMany({
				where: {
					reportId: input.reportId,
				},
				orderBy: {
					startDate: "desc",
				},
			});
		}),

	createReceipt: orgProcedure
		.input(createReceiptExpenseSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user owns the report
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.reportId,
					organizationId: ctx.organizationId,
				},
				select: {
					ownerId: true,
					status: true,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			if (
				report.status !== ReportStatus.DRAFT &&
				report.status !== ReportStatus.NEEDS_REVISION
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You can only add expenses to draft or needs revision reports",
				});
			}

			if (report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to add expenses to this report",
				});
			}

			// Verify every attachment key belongs to this organization
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

			// Create the meta data
			const meta = JSON.stringify({});

			const expense = await ctx.db.expense.create({
				data: {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.RECEIPT,
					amount: input.amount,
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					meta: meta,
					attachments: {
						createMany: {
							data: input.attachments.map((a) => ({
								key: a.key,
								size: a.size,
								originalName: a.originalName,
							})),
						},
					},
				},
			});

			if (!expense) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create expense",
				});
			}

			return expense;
		}),

	createTravel: orgProcedure
		.input(createTravelExpenseSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user owns the report
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.reportId,
					organizationId: ctx.organizationId,
				},
				select: {
					ownerId: true,
					status: true,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			if (
				report.status !== ReportStatus.DRAFT &&
				report.status !== ReportStatus.NEEDS_REVISION
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You can only add expenses to draft or needs revision reports",
				});
			}

			if (report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to add expenses to this report",
				});
			}

			const settings = await ctx.db.settings.findUnique({
				where: { organizationId: ctx.organizationId },
				select: {
					kilometerRate: true,
				},
			});

			if (!settings) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "App settings have not been set up correctly",
				});
			}

			// Create the meta data
			const meta = {
				from: input.from,
				to: input.to,
				distance: input.distance,
			};

			return await ctx.db.expense.create({
				data: {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.TRAVEL,
					amount: Number(input.distance) * Number(settings.kilometerRate),
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					meta,
				},
			});
		}),

	createFood: orgProcedure
		.input(createFoodExpenseSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user owns the report
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.reportId,
					organizationId: ctx.organizationId,
				},
				select: {
					ownerId: true,
					status: true,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			if (
				report.status !== ReportStatus.DRAFT &&
				report.status !== ReportStatus.NEEDS_REVISION
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You can only add expenses to draft or needs revision reports",
				});
			}

			if (report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to add expenses to this report",
				});
			}

			// Create the meta data
			const meta = {
				days: input.days,
				breakfastDeduction: input.breakfastDeduction,
				lunchDeduction: input.lunchDeduction,
				dinnerDeduction: input.dinnerDeduction,
			};

			return await ctx.db.expense.create({
				data: {
					report: { connect: { id: input.reportId } },
					type: ExpenseType.FOOD,
					amount: input.amount,
					startDate: input.startDate,
					endDate: input.endDate,
					description: input.description,
					meta,
				},
			});
		}),

	// Update an expense
	update: orgProcedure
		.input(
			z.object({
				id: z.string(),
				description: z.string().optional(),
				amount: z.number().min(0).optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
				// TRAVEL-specific meta fields
				from: z.string().min(1).optional(),
				to: z.string().min(1).optional(),
				distance: z.number().min(1).optional(),
				// FOOD-specific meta fields
				days: z.number().min(1).optional(),
				breakfastDeduction: z.number().min(0).optional(),
				lunchDeduction: z.number().min(0).optional(),
				dinnerDeduction: z.number().min(0).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const {
				id,
				from,
				to,
				distance,
				days,
				breakfastDeduction,
				lunchDeduction,
				dinnerDeduction,
				...baseData
			} = input;

			const expense = await ctx.db.expense.findUnique({
				where: { id },
				include: {
					report: {
						select: {
							ownerId: true,
							organizationId: true,
						},
					},
				},
			});

			if (!expense) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Expense not found",
				});
			}

			if (expense.report.organizationId !== ctx.organizationId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Expense not found",
				});
			}

			if (expense.report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this expense",
				});
			}

			const updateData: Prisma.ExpenseUpdateInput = { ...baseData };

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
					const settings = await ctx.db.settings.findUnique({
						where: { organizationId: ctx.organizationId },
					});
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

			return ctx.db.expense.update({
				where: { id },
				data: updateData,
			});
		}),

	// Delete an expense
	delete: orgProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const expense = await ctx.db.expense.findUnique({
				where: { id: input.id },
				include: {
					report: {
						select: {
							ownerId: true,
							organizationId: true,
						},
					},
				},
			});

			if (!expense) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Expense not found",
				});
			}

			if (expense.report.organizationId !== ctx.organizationId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Expense not found",
				});
			}

			if (expense.report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to delete this expense",
				});
			}

			return ctx.db.expense.delete({
				where: { id: input.id },
			});
		}),

	get: orgProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const expense = await ctx.db.expense.findUnique({
				where: { id: input.id },
				include: {
					report: {
						select: {
							ownerId: true,
							organizationId: true,
						},
					},
				},
			});

			if (!expense) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Expense not found",
				});
			}

			if (expense.report.organizationId !== ctx.organizationId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Expense not found",
				});
			}

			// Only allow admins and owners to access the expense
			const isAdmin = isOrganizationAdminRole(ctx.orgRole);
			if (!isAdmin && expense.report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to access this expense",
				});
			}

			// Check if the meta data is valid for the expense type
			const type = expense.type;

			if (type === "RECEIPT") {
				const result = receiptExpenseMetaSchema.safeParse(expense.meta);

				if (!result.success) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid Receipt meta data",
					});
				}

				return {
					...expense,
					type: "RECEIPT",
					...result.data,
				};
			}
			if (type === "TRAVEL") {
				const result = travelExpenseMetaSchema.safeParse(expense.meta);

				if (!result.success) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid Travel meta data",
					});
				}

				return {
					...expense,
					type: "TRAVEL",
					...result.data,
				};
			}

			if (type === "FOOD") {
				const result = foodExpenseMetaSchema.safeParse(expense.meta);

				if (!result.success) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid Food meta data",
					});
				}

				return {
					...expense,
					type: "FOOD",
					...result.data,
				};
			}

			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid expense type",
			});
		}),
});
