import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { ReportStatus } from "@zemio/db";
import type { z } from "zod";
import { env } from "@/env";
import { isOrganizationAdminRole } from "@/lib/organization";
import type { createReportSchema } from "@/lib/validators";
import { mapPrismaError } from "@/server/shared/errors";
import { nullableDecimalToNumber } from "@/server/shared/money";
import type {
	CursorPage,
	CursorPaginationInput,
} from "@/server/shared/pagination";
import { toCursorPage } from "@/server/shared/pagination";
import {
	type FinancialSummaryDTO,
	type ReportListItemDTO,
	type ReviewDTO,
	type ReviewListItemDTO,
	toFinancialSummaryDTO,
	toReportListItemDTO,
	toReviewDTO,
} from "./report.dto";
import { type ReportEventEmitter, reportEventBus } from "./report.events";
import { authorizeReport } from "./report.policy";
import {
	buildReportListOrderBy,
	buildReportListWhere,
	type ReportListInput,
} from "./report.query";
import {
	type ReportDetail,
	type ReportRepository,
	reportRepository,
} from "./report.repository";
import { assertAdminTransition, assertSubmittable } from "./report.state";

/** Runs a repository write, mapping Prisma errors (P2002/P2025/…) to typed TRPCErrors. */
async function runWrite<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw mapPrismaError(error);
	}
}

/** Request-scoped facts the service needs. Authorization is enforced upstream. */
export type ReportServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
	orgRole: string;
};

type CreateReportInput = z.infer<typeof createReportSchema>;
type UpdateReportInput = { title?: string; description?: string };
type TransitionInput = { status: ReportStatus; notify?: boolean };

type PdfExportResult = { url: string; filename: string };

export function createReportService(deps: {
	repo: ReportRepository;
	events: ReportEventEmitter;
}) {
	const { repo, events } = deps;

	return {
		async list(
			ctx: ReportServiceContext,
			input: ReportListInput,
		): Promise<{
			reports: ReportListItemDTO[];
			pagination: { page: number; pageSize: number; pageCount: number };
		}> {
			const where = buildReportListWhere({
				scope: "own",
				filters: input.filters,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
			});
			const orderBy = buildReportListOrderBy(input.sorting);
			const take = input.pageSize;
			const skip = (input.page - 1) * input.pageSize;

			const [rows, count] = await Promise.all([
				repo.listOwned(ctx.db, { where, orderBy, take, skip }),
				repo.count(ctx.db, where),
			]);

			const sums = await repo.sumByReportIds(
				ctx.db,
				rows.map((row) => row.id),
			);
			const sumByReportId = new Map(
				sums.map((entry) => [
					entry.reportId,
					nullableDecimalToNumber(entry._sum.amount),
				]),
			);

			return {
				reports: rows.map((row) =>
					toReportListItemDTO(row, sumByReportId.get(row.id) ?? 0),
				),
				pagination: {
					page: input.page,
					pageSize: input.pageSize,
					pageCount: Math.ceil(count / input.pageSize),
				},
			};
		},

		async reviewList(
			ctx: ReportServiceContext,
			input: CursorPaginationInput,
		): Promise<CursorPage<ReviewListItemDTO>> {
			// Same scope-aware query core as `list`, widened to the whole org.
			const where = buildReportListWhere({
				scope: "all",
				organizationId: ctx.organizationId,
				userId: ctx.userId,
			});
			const { rows, totalCount } = await repo.reviewListPage(ctx.db, {
				where,
				limit: input.limit,
				cursor: input.cursor,
			});
			return toCursorPage(rows, input.limit, totalCount, (row) => row.id);
		},

		async review(
			ctx: ReportServiceContext,
			input: { id: string },
		): Promise<ReviewDTO> {
			const detail = await repo.reviewDetail(ctx.db, {
				id: input.id,
				organizationId: ctx.organizationId,
			});
			if (!detail) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
			}
			return toReviewDTO(detail);
		},

		async financialSummary(
			ctx: ReportServiceContext,
			input: { id: string },
		): Promise<FinancialSummaryDTO> {
			const { report, totalAmount } = await repo.financialSummary(ctx.db, {
				id: input.id,
				organizationId: ctx.organizationId,
			});
			if (!report) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
			}

			authorizeReport(
				"read",
				{
					userId: ctx.userId,
					isOrgAdmin: isOrganizationAdminRole(ctx.orgRole),
				},
				{ ownerId: report.ownerId, status: report.status },
			);

			return toFinancialSummaryDTO(report.bankingDetails, totalAmount);
		},

		async create(
			ctx: ReportServiceContext,
			input: CreateReportInput,
		): Promise<{ id: string }> {
			const banking = await repo.findBankingDetailsOwner(
				ctx.db,
				input.bankingDetailsId,
			);
			if (!banking || banking.userId !== ctx.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You don't have permission to create a report with these banking details",
				});
			}

			const costUnit = await repo.findCostUnit(ctx.db, {
				id: input.costUnitId,
				organizationId: ctx.organizationId,
			});
			if (!costUnit) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Cost unit not found",
				});
			}

			return runWrite(() =>
				repo.create(ctx.db, {
					...input,
					ownerId: ctx.userId,
					organizationId: ctx.organizationId,
					status: ReportStatus.DRAFT,
				}),
			);
		},

		update(
			ctx: ReportServiceContext,
			report: ReportDetail,
			input: UpdateReportInput,
		): Promise<{ id: string }> {
			return runWrite(() => repo.update(ctx.db, { id: report.id, data: input }));
		},

		remove(
			ctx: ReportServiceContext,
			report: ReportDetail,
		): Promise<{ id: string }> {
			return runWrite(() => repo.remove(ctx.db, report.id));
		},

		async submit(
			ctx: ReportServiceContext,
			report: ReportDetail,
		): Promise<{ id: string }> {
			assertSubmittable(report.status);
			await runWrite(() =>
				repo.setStatus(ctx.db, {
					id: report.id,
					status: ReportStatus.PENDING_APPROVAL,
				}),
			);

			const settings = await repo.findReviewerEmail(ctx.db, ctx.organizationId);

			events.emit("report.submitted", {
				reportId: report.id,
				title: report.title,
				ownerName: report.owner.name,
				ownerEmail: report.owner.email,
				ownerNotificationPref: report.owner.preferences?.notifications ?? null,
				reviewerEmail: settings?.reviewerEmail ?? null,
			});

			return { id: report.id };
		},

		async transition(
			ctx: ReportServiceContext,
			report: ReportDetail,
			input: TransitionInput,
		): Promise<{ id: string; status: ReportStatus }> {
			assertAdminTransition(report.status, input.status);
			const updated = await runWrite(() =>
				repo.setStatus(ctx.db, {
					id: report.id,
					status: input.status,
				}),
			);

			events.emit("report.status_changed", {
				reportId: report.id,
				title: report.title,
				status: input.status,
				ownerName: report.owner.name,
				ownerEmail: report.owner.email,
				ownerNotificationPref: report.owner.preferences?.notifications ?? null,
				notify: input.notify ?? false,
			});

			return updated;
		},

		async exportToPdf(
			ctx: ReportServiceContext,
			input: { id: string },
		): Promise<PdfExportResult> {
			const response = await fetch(`${env.API_URL}/pdf/report/${input.id}`, {
				method: "POST",
				headers: {
					"X-Service-Key": env.INTERNAL_API_SECRET,
					"X-User-Id": ctx.userId,
					"X-Organization-Id": ctx.organizationId,
					"X-Member-Role": ctx.orgRole,
				},
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				const message =
					typeof body === "object" && body !== null && "error" in body
						? String((body as { error: unknown }).error)
						: "PDF generation failed";
				throw new TRPCError({
					code:
						response.status === 404
							? "NOT_FOUND"
							: response.status === 403
								? "FORBIDDEN"
								: "INTERNAL_SERVER_ERROR",
					message,
				});
			}

			return (await response.json()) as PdfExportResult;
		},
	};
}

export type ReportService = ReturnType<typeof createReportService>;

/** Default service instance wired with the real repository and event bus. */
export const reportService = createReportService({
	repo: reportRepository,
	events: reportEventBus,
});
