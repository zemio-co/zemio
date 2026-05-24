import { TRPCError } from "@trpc/server";
import { z } from "zod";
import ExpenseReportCreatorNotification from "@/components/emails/expense-report-creator-notification";
import ExpenseReportReviewerNotification from "@/components/emails/expense-report-reviewer-notification";
import ReportReceivedEmail from "@/components/emails/report-received-email";
import ReportSubmittedEmail from "@/components/emails/report-submitted-email";
import type { Prisma } from "@/generated/prisma/client";
import { NotificationPreference, ReportStatus } from "@/generated/prisma/enums";
import { decryptBankingDetails } from "@/lib/banking/cryptic";
import { DEFAULT_EMAIL_FROM } from "@/lib/consts";
import { mailer } from "@/lib/email";
import { logger } from "@/lib/logger";
import { isOrganizationAdminRole } from "@/lib/organization";
import { createReportSchema } from "@/lib/validators";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
} from "@/server/api/trpc";
import {
	buildReportPdfFilename,
	generatePdfSummary,
} from "@/server/pdf/summary";

const REPORT_STATUSES: ReportStatus[] = [
	"ACCEPTED",
	"DRAFT",
	"NEEDS_REVISION",
	"PENDING_APPROVAL",
	"REJECTED",
];

const reportListFilterSchema = z
	.object({
		createdAt: z
			.object({
				end: z.coerce.date(),
				start: z.coerce.date(),
			})
			.optional(),
		status: z
			.object({
				operator: z.enum(["is", "is-not"]),
				value: z.nativeEnum(ReportStatus),
			})
			.optional(),
	})
	.optional();

const reportListSortingSchema = z
	.array(
		z.object({
			desc: z.boolean(),
			id: z.enum(["createdAt", "lastUpdatedAt", "status", "tag", "title"]),
		}),
	)
	.max(1)
	.optional();

type ReportListFilters = z.infer<typeof reportListFilterSchema>;
type ReportListSorting = z.infer<typeof reportListSortingSchema>;

function _buildReportListWhere(
	userId: string,
	organizationId: string,
	filters: ReportListFilters,
): Prisma.ReportWhereInput {
	const where: Prisma.ReportWhereInput = {
		organizationId,
		ownerId: userId,
	};

	if (filters?.createdAt) {
		where.createdAt = {
			gte: filters.createdAt.start,
			lte: filters.createdAt.end,
		};
	}

	if (filters?.status) {
		where.status =
			filters.status.operator === "is"
				? filters.status.value
				: { not: filters.status.value };
	}

	return where;
}

function _buildReportListOrderBy(
	sorting: ReportListSorting,
): Prisma.ReportOrderByWithRelationInput {
	const sort = sorting?.[0];

	if (!sort) {
		return { createdAt: "desc" };
	}

	return {
		[sort.id]: sort.desc ? "desc" : "asc",
	};
}

const listFiltering = z.object({
	status: z
		.object({
			filter: z.enum(["in", "not-in"]),
			values: z.enum(REPORT_STATUSES).array(),
		})
		.optional(),
	costUnit: z
		.object({
			filter: z.enum(["in", "not-in"]),
			values: z.string().array(),
		})
		.optional(),
	title: z
		.object({
			filter: z.literal("LIKE").optional().default("LIKE"),
			value: z.string(),
		})
		.optional(),
	owner: z
		.object({
			filter: z.enum(["in", "not-in"]),
			values: z.string().array(),
		})
		.optional(),
	createdAt: z
		.object({
			filter: z.enum(["between"]).optional().default("between"),
			startDate: z.date(),
			endDate: z.date(),
		})
		.optional(),
	updatedAt: z
		.object({
			filter: z.enum(["between"]).optional().default("between"),
			startDate: z.date(),
			endDate: z.date(),
		})
		.optional(),
});

const listSorting = z.object({
	column: z.enum(["updatedAt", "createdAt"]),
	direction: z.enum(["asc", "desc"]).optional().default("asc"),
});

const buildListFilters = (
	userId: string,
	organizationId: string,
	filters?: z.infer<typeof listFiltering>,
) => {
	const where: Prisma.ReportWhereInput = {
		organizationId,
		ownerId: userId,
	};

	if (filters?.status) {
		const clause = filters.status;

		if (clause.filter === "in") {
			where.status = {
				in: clause.values,
			};
		} else {
			where.status = {
				notIn: clause.values,
			};
		}
	}

	if (filters?.costUnit) {
		const clause = filters.costUnit;

		if (clause.filter === "in") {
			where.costUnit = {
				id: {
					in: clause.values,
				},
			};
		} else {
			where.costUnit = {
				id: {
					notIn: clause.values,
				},
			};
		}
	}

	if (filters?.title) {
		const clause = filters.title;

		if (clause.filter === "LIKE") {
			where.title = {
				contains: clause.value,
				mode: "insensitive",
			};
		}
	}

	if (filters?.owner) {
		const clause = filters.owner;

		if (clause.filter === "in") {
			where.owner = {
				id: {
					in: clause.values,
				},
			};
		} else {
			where.owner = {
				id: {
					notIn: clause.values,
				},
			};
		}
	}

	if (filters?.createdAt) {
		const clause = filters.createdAt;

		if (clause.filter === "between") {
			where.createdAt = {
				gte: clause.startDate,
				lte: clause.endDate,
			};
		}
	}

	if (filters?.updatedAt) {
		const clause = filters.updatedAt;

		if (clause.filter === "between") {
			where.createdAt = {
				gte: clause.startDate,
				lte: clause.endDate,
			};
		}
	}

	return where;
};

const buildListSorting = (sorting?: z.infer<typeof listSorting>) => {
	const res: Prisma.ReportOrderByWithRelationInput = {};

	if (sorting?.column === "createdAt") {
		const _res = {
			createdAt: sorting.direction === "asc" ? "asc" : "desc",
		};
	}

	return res;
};

export const reportRouter = createTRPCRouter({
	listOwn: orgProcedure
		.input(
			z.object({
				filters: reportListFilterSchema,
				limit: z.number().int().min(1).max(101).optional(),
				page: z.number().int().min(1),
				pageSize: z.number().int().min(1).max(100),
				sorting: reportListSortingSchema,
				sort: listSorting.optional(),
				filter: listFiltering.optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const where = buildListFilters(userId, ctx.organizationId, input.filter);
			const orderBy = buildListSorting(input.sort);

			const [reports, count] = await ctx.db.$transaction([
				ctx.db.report.findMany({
					where,
					orderBy,
					include: {
						expenses: {
							select: {
								amount: true,
							},
						},
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
					take: Math.min(input.limit ?? input.pageSize, input.pageSize + 1),
					skip: (input.page - 1) * input.pageSize,
				}),
				ctx.db.report.count({
					where,
				}),
			]);

			return {
				reports: reports.map((report) => ({
					...report,
					sum: report.expenses.reduce(
						(total, expense) => total + Number(expense.amount),
						0,
					),
				})),
				pagination: {
					page: input.page,
					pageSize: input.pageSize,
					pageCount: Math.ceil(count / input.pageSize),
				},
			};
		}),

	// Get all reports for the current user
	getAll: orgProcedure.query(async ({ ctx }) => {
		const reports = await ctx.db.report.findMany({
			where: {
				organizationId: ctx.organizationId,
				ownerId: ctx.session.user.id,
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

		return reports.map((report) => ({
			...report,
			expenses: report.expenses.map((expense) => ({
				...expense,
				amount: Number(expense.amount),
			})),
			sum: report.expenses.reduce(
				(sum, expense) => sum + Number(expense.amount),
				0,
			),
		}));
	}),

	getById: orgProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				include: {
					owner: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
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

			const isAdmin = isOrganizationAdminRole(ctx.orgRole);
			if (!isAdmin && report?.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this report",
				});
			}

			return report;
		}),

	getDetails: orgProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const existsReport = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
			});

			if (!existsReport) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			const isAdmin = isOrganizationAdminRole(ctx.orgRole);
			if (!isAdmin && existsReport?.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this report",
				});
			}

			const [report, totalAmount] = await ctx.db.$transaction([
				ctx.db.report.findUnique({
					where: {
						id: input.id,
					},
					select: {
						bankingDetails: true,
					},
				}),
				// Query to sum the amount of all expenses for this report
				ctx.db.expense.aggregate({
					where: {
						reportId: input.id,
						report: {
							organizationId: ctx.organizationId,
						},
					},
					_sum: {
						amount: true,
					},
				}),
			]);

			if (!report || !report.bankingDetails) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			const decryptedBankingDetails = decryptBankingDetails(report.bankingDetails);

			return {
				totalAmount: totalAmount._sum.amount ? Number(totalAmount._sum.amount) : 0,
				iban: decryptedBankingDetails.iban,
				ownerName: decryptedBankingDetails.fullName,
			};
		}),

	// Create a new report
	create: orgProcedure
		.input(createReportSchema)
		.mutation(async ({ ctx, input }) => {
			const bankingDetails = await ctx.db.bankingDetails.findUnique({
				where: {
					id: input.bankingDetailsId,
				},
				select: {
					userId: true,
				},
			});

			if (!bankingDetails || bankingDetails.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You don't have permission to create a report with these banking details",
				});
			}

			const costUnit = await ctx.db.costUnit.findFirst({
				where: {
					id: input.costUnitId,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
				},
			});

			if (!costUnit) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Cost unit not found",
				});
			}

			// Create the report
			const report = await ctx.db.report.create({
				data: {
					...input,
					ownerId: ctx.session.user.id,
					organizationId: ctx.organizationId,
					status: ReportStatus.DRAFT,
				},
				include: {
					expenses: {
						include: {
							attachments: true,
						},
					},
					owner: {
						select: {
							id: true,
							name: true,
							email: true,
							preferences: {
								select: {
									notifications: true,
								},
							},
						},
					},
					costUnit: {
						select: {
							title: true,
						},
					},
				},
			});

			// Calculate total amount and collect attachments
			const totalAmount = report.expenses.reduce(
				(sum, expense) => sum + Number(expense.amount),
				0,
			);
			const attachments = report.expenses.flatMap((expense) =>
				expense.attachments.map((attachment) => ({
					id: attachment.id,
					key: attachment.key,
				})),
			);

			// Send email to creator (non-blocking)
			if (
				report.owner.email &&
				report.owner.preferences?.notifications === NotificationPreference.ALL
			) {
				mailer
					.send({
						from: DEFAULT_EMAIL_FROM,
						to: [report.owner.email],
						subject: "Spesenantrag erstellt",
						react: (
							<ExpenseReportCreatorNotification
								attachments={attachments}
								report={report}
								totalAmount={totalAmount}
							/>
						),
					})
					.catch((error) => {
						logger.error("Email dispatch failed: creator notification", { error });
						void logger.flush();
					});
			}

			return report;
		}),

	// Update a report
	update: orgProcedure
		.input(
			z.object({
				id: z.string(),
				title: z.string().min(1).optional(),
				description: z.string().optional(),
				businessUnitId: z.string().min(1).optional(),
				accountingUnitId: z.string().min(1).optional(),
				status: z.nativeEnum(ReportStatus).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			// Check if user owns the report
			const existingReport = await ctx.db.report.findFirst({
				where: {
					id,
					organizationId: ctx.organizationId,
				},
			});

			if (!existingReport) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			if (existingReport.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this report",
				});
			}

			// Update the report
			const report = await ctx.db.report.update({
				where: { id },
				data,
				include: {
					expenses: {
						include: {
							attachments: true,
						},
					},
					owner: {
						select: {
							id: true,
							name: true,
							email: true,
							preferences: {
								select: {
									notifications: true,
								},
							},
						},
					},
					costUnit: {
						select: {
							title: true,
						},
					},
				},
			});

			// Calculate total amount and collect attachments
			const totalAmount = report.expenses.reduce(
				(sum, expense) => sum + Number(expense.amount),
				0,
			);
			const attachments = report.expenses.flatMap((expense) =>
				expense.attachments.map((attachment) => ({
					id: attachment.id,
					key: attachment.key,
				})),
			);

			// Get settings to find reviewer email
			const settings = await ctx.db.settings.findUnique({
				where: { organizationId: ctx.organizationId },
				select: {
					reviewerEmail: true,
				},
			});

			// Send email to creator (non-blocking)
			if (
				report.owner.email &&
				report.owner.preferences?.notifications === NotificationPreference.ALL
			) {
				mailer
					.send({
						from: DEFAULT_EMAIL_FROM,
						to: [report.owner.email],
						subject: "Spesenantrag geändert",
						react: (
							<ExpenseReportCreatorNotification
								attachments={attachments}
								report={report}
								totalAmount={totalAmount}
							/>
						),
					})
					.catch((error) => {
						logger.error("Email dispatch failed: creator notification", { error });
						void logger.flush();
					});
			}

			// Send email to reviewer if configured (non-blocking)
			if (settings?.reviewerEmail) {
				mailer
					.send({
						from: DEFAULT_EMAIL_FROM,
						to: [settings.reviewerEmail],
						subject: "Spesenantrag geändert",
						react: (
							<ExpenseReportReviewerNotification
								attachments={attachments}
								ownerName={report.owner.name ?? "Unbekannt"}
								report={report}
								totalAmount={totalAmount}
							/>
						),
					})
					.catch((error) => {
						logger.error("Email dispatch failed: reviewer notification", { error });
						void logger.flush();
					});
			}

			return report;
		}),

	// Delete a report
	delete: orgProcedure
		.input(z.object({ id: z.string() }))
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

			if (report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to delete this report",
				});
			}

			return ctx.db.report.delete({
				where: { id: input.id },
			});
		}),
	/**
	 * This procedure is only intended for admin use. To set the status of a report from
	 * draft to pending approval, use the submit procedure.
	 */
	updateStatus: orgAdminProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.nativeEnum(ReportStatus),
				notify: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existingReport = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
				},
			});

			if (!existingReport) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			const result = await ctx.db.report.update({
				where: { id: input.id },
				data: { status: input.status },
				include: {
					expenses: {
						include: {
							attachments: true,
						},
					},
					owner: {
						select: {
							email: true,
							name: true,
							preferences: {
								select: {
									notifications: true,
								},
							},
						},
					},
					costUnit: {
						select: {
							title: true,
						},
					},
				},
			});

			if (!result) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update report status",
				});
			}

			if (
				!input.notify ||
				result.owner.preferences?.notifications === NotificationPreference.NONE
			) {
				return result;
			}

			const totalAmount = result.expenses.reduce(
				(sum, expense) => sum + Number(expense.amount),
				0,
			);
			const attachments = result.expenses.flatMap((expense) =>
				expense.attachments.map((attachment) => ({
					id: attachment.id,
					key: attachment.key,
				})),
			);

			const emailResult = await mailer.send({
				from: DEFAULT_EMAIL_FROM,
				to: [result.owner.email],
				subject: "Report status changed",
				react: (
					<ExpenseReportReviewerNotification
						attachments={attachments}
						ownerName={result.owner.name ?? "Unbekannt"}
						report={result}
						totalAmount={totalAmount}
					/>
				),
			});

			if (emailResult.ok === false) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: emailResult.error ?? "Failed to send email",
				});
			}

			return result;
		}),

	/**
	 * This procedure is only intended for the owner of the report to submit it when ready. Only allowed
	 * when status is draft or needs revision. When submitted, the status is set to pending approval.
	 *
	 * For force setting the status to pending approval, use the updateStatus procedure.
	 */
	submit: orgProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const report = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					owner: {
						select: {
							id: true,
							email: true,
							name: true,
							preferences: {
								select: {
									notifications: true,
								},
							},
						},
					},
					status: true,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			// Only the owner of the report can submit it
			if (report.owner.id !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to submit this report",
				});
			}

			// Only allowed when status is draft or needs revision
			const { status } = report;
			if (
				status !== ReportStatus.DRAFT &&
				status !== ReportStatus.NEEDS_REVISION
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Report is not available for submission.`,
				});
			}

			// Update the status to pending approval
			const res = await ctx.db.report.update({
				where: { id: input.id },
				data: { status: ReportStatus.PENDING_APPROVAL },
				select: {
					title: true,
					owner: {
						select: {
							name: true,
						},
					},
				},
			});

			if (!res) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update report status",
				});
			}

			const settings = await ctx.db.settings.findUnique({
				where: {
					organizationId: ctx.organizationId,
				},
			});

			if (!settings?.reviewerEmail) {
				return res;
			}

			const emailResult = await mailer.send({
				from: DEFAULT_EMAIL_FROM,
				to: [settings.reviewerEmail],
				subject: "Report submitted",
				react: <ReportReceivedEmail from={res.owner.name} title={res.title} />,
			});

			if (emailResult.ok === false) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: emailResult.error ?? "Failed to send email",
				});
			}

			if (report.owner.preferences?.notifications !== NotificationPreference.ALL) {
				return res;
			}

			const confirmEmailResult = await mailer.send({
				from: DEFAULT_EMAIL_FROM,
				to: [report.owner.email],
				subject: "Report submitted",
				react: <ReportSubmittedEmail name={report.owner.name} title={res.title} />,
			});

			if (confirmEmailResult.ok === false) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: confirmEmailResult.error ?? "Failed to send confirmation email",
				});
			}
		}),

	exportToPdf: orgProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const existsReport = await ctx.db.report.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					ownerId: true,
				},
			});

			if (!existsReport) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			if (
				!isOrganizationAdminRole(ctx.orgRole) &&
				existsReport.ownerId !== ctx.session.user.id
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to export this report to PDF",
				});
			}

			const report = await ctx.db.report.findUnique({
				where: { id: input.id },
				include: {
					expenses: {
						include: {
							attachments: true,
						},
					},
					owner: true,
					costUnit: {
						select: {
							tag: true,
							title: true,
						},
					},
					bankingDetails: true,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			const decryptedBankingDetails = decryptBankingDetails(report.bankingDetails);

			const pdfBuffer = await generatePdfSummary({
				report: {
					...report,
					bankingDetails: decryptedBankingDetails,
				},
			});

			// Convert buffer to base64 string for transmission
			const base64Pdf = pdfBuffer.toString("base64");

			return {
				pdf: base64Pdf,
				filename: buildReportPdfFilename(report),
			};
		}),
});
