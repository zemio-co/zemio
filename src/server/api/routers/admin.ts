import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ReportStatus } from "@/generated/prisma/enums";
import { createTRPCRouter, orgAdminProcedure } from "@/server/api/trpc";

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 50;

const paginationInput = z.object({
	limit: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
	cursor: z.string().nullish(),
});

export const adminRouter = createTRPCRouter({
	/**
	 * Returns filter options for the admin reports list.
	 * Fetches cost units and owners directly from their respective tables.
	 */
	getFilterOptions: orgAdminProcedure.query(async ({ ctx }) => {
		const [costUnits, owners] = await ctx.db.$transaction([
			ctx.db.costUnit.findMany({
				where: {
					organizationId: ctx.organizationId,
				},
				select: { tag: true },
				orderBy: { tag: "asc" },
			}),
			ctx.db.user.findMany({
				where: {
					ownReports: {
						some: {
							organizationId: ctx.organizationId,
						},
					},
				},
				select: { email: true, name: true, image: true },
				orderBy: { name: "asc" },
			}),
		]);

		return {
			costUnits: costUnits.map((cu) => ({
				label: cu.tag,
				value: cu.tag,
			})),
			owners: owners.map((owner) => ({
				label: owner.name,
				value: owner.email,
				image: owner.image,
			})),
		};
	}),

	/**
	 * Paginated list of all reports with cursor-based pagination.
	 * Returns items, nextCursor, and totalCount for infinite scroll.
	 */
	listAllPaginated: orgAdminProcedure
		.input(paginationInput)
		.query(async ({ ctx, input }) => {
			const { limit, cursor } = input;

			const [items, totalCount] = await ctx.db.$transaction([
				ctx.db.report.findMany({
					take: limit + 1, // Fetch one extra to determine if there's a next page
					cursor: cursor ? { id: cursor } : undefined,
					where: {
						organizationId: ctx.organizationId,
					},
					include: {
						owner: {
							select: {
								name: true,
								image: true,
								email: true,
							},
						},
						costUnit: {
							select: {
								tag: true,
							},
						},
					},
					orderBy: {
						lastUpdatedAt: "desc",
					},
				}),
				ctx.db.report.count({
					where: {
						organizationId: ctx.organizationId,
					},
				}),
			]);

			let nextCursor: string | undefined;
			if (items.length > limit) {
				const nextItem = items.pop();
				nextCursor = nextItem?.id;
			}

			return {
				items,
				nextCursor,
				totalCount,
			};
		}),

	/**
	 * @deprecated Use listAllPaginated instead for better performance
	 */
	listAll: orgAdminProcedure.query(async ({ ctx }) => {
		return ctx.db.report.findMany({
			where: {
				organizationId: ctx.organizationId,
			},
			include: {
				owner: {
					select: {
						name: true,
						image: true,
						email: true,
					},
				},
				costUnit: {
					select: {
						tag: true,
					},
				},
			},
			orderBy: {
				lastUpdatedAt: "desc",
			},
		});
	}),

	stats: orgAdminProcedure.query(async ({ ctx }) => {
		const { db } = ctx;

		const [totalReports, openReports, totalAmount] = await db.$transaction([
			db.report.count({
				where: {
					organizationId: ctx.organizationId,
				},
			}),
			db.report.count({
				where: {
					organizationId: ctx.organizationId,
					status: {
						in: [ReportStatus.PENDING_APPROVAL],
					},
				},
			}),
			db.expense.aggregate({
				where: {
					report: {
						organizationId: ctx.organizationId,
					},
				},
				_sum: {
					amount: true,
				},
			}),
		]);

		return {
			totalCount: totalReports,
			openCount: openReports,
			totalAmount: totalAmount._sum.amount ? Number(totalAmount._sum.amount) : 0,
		};
	}),
	listOpen: orgAdminProcedure.query(async ({ ctx }) => {
		const reports = await ctx.db.report.findMany({
			where: {
				organizationId: ctx.organizationId,
				status: {
					in: [ReportStatus.PENDING_APPROVAL],
				},
			},
			include: {
				owner: {
					select: {
						name: true,
					},
				},
				expenses: {
					select: {
						amount: true,
					},
				},
			},
			orderBy: {
				lastUpdatedAt: "desc",
			},
		});

		return reports.map((report) => ({
			...report,
			expenses: report.expenses.map((expense) => ({
				...expense,
				amount: Number(expense.amount),
			})),
		}));
	}),
	/**
	 * Lists all reports, which are NOT open and not a draft which have been updated in the last 30 days
	 */
	listRelevant: orgAdminProcedure.query(async ({ ctx }) => {
		const pastDate = new Date(Date.now() - THIRTY_DAYS_IN_MS);

		const reports = await ctx.db.report.findMany({
			where: {
				organizationId: ctx.organizationId,
				status: {
					notIn: [ReportStatus.PENDING_APPROVAL, ReportStatus.DRAFT],
				},
				lastUpdatedAt: {
					gte: pastDate,
				},
			},
			include: {
				expenses: {
					select: {
						amount: true,
					},
				},
				owner: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				lastUpdatedAt: "desc",
			},
		});

		return reports.map((report) => ({
			...report,
			expenses: report.expenses.map((expense) => ({
				...expense,
				amount: Number(expense.amount),
			})),
		}));
	}),
	getAllReports: orgAdminProcedure.query(async ({ ctx }) => {
		return ctx.db.report.findMany({
			where: {
				organizationId: ctx.organizationId,
			},
			include: {
				expenses: true,
				owner: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});
	}),

	// Get a single report by ID (admin can access any report)
	getReportById: orgAdminProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				include: {
					expenses: true,
					owner: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			return report;
		}),

	// Update report status (admin only)
	updateReportStatus: orgAdminProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.nativeEnum(ReportStatus),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			return ctx.db.report.update({
				where: { id: input.id },
				data: { status: input.status },
				include: {
					expenses: true,
					owner: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});
		}),
});
