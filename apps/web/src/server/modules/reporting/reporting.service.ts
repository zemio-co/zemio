import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { ReportStatus } from "@zemio/db";
import { env } from "@/env";
import { translateExpenseType, translateReportStatus } from "@/lib/utils";
import {
	buildPeriodSeries,
	fillPeriodGaps,
	startOfPeriod,
} from "@/server/modules/dashboard";
import { decimalToNumber } from "@/server/shared/money";
import {
	MAX_BREAKDOWN_ROWS,
	type ReportingBreakdownDTO,
	type ReportingExportDTO,
	type ReportingOverviewDTO,
	type ReportingPdfExportResult,
	type ReportingPdfFilterInput,
	type ReportingTimeSeriesDTO,
	type ReportingTimeSeriesInput,
} from "./reporting.dto";
import { type ReportingFilterInput, reportingWhere } from "./reporting.query";
import {
	type ReportingReportRow,
	type ReportingRepository,
	reportingRepository,
} from "./reporting.repository";

export type ReportingServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
	orgRole: string;
};

type Bucket = { label: string; amount: number; count: number };

/**
 * Re-buckets DB-aggregated per-report sums by an arbitrary report attribute.
 *
 * This pulls every matching report's id/attribute row into Node rather than
 * grouping by that attribute in Postgres directly — Prisma can't `groupBy` on
 * a relation field (`Expense.amount` summed by `Report.status/costUnitId/
 * ownerId`) in one call the way `byExpenseType`'s single-step `groupBy` can
 * for `Expense.type`. Acceptable at current org sizes (bounded by report
 * count per filtered period, not expense count); if this becomes a hot path,
 * the fix is a raw SQL join (same pattern as `submittedSeries`/
 * `reimbursedSeries` below), not re-merging endpoints.
 */
function bucketReportsBy<K extends string>(args: {
	reports: ReportingReportRow[];
	sums: Map<string, number>;
	keyOf: (report: ReportingReportRow) => K;
	labelOf: (report: ReportingReportRow) => string;
}): Map<K, Bucket> {
	const buckets = new Map<K, Bucket>();

	for (const report of args.reports) {
		const amount = args.sums.get(report.id) ?? 0;
		const key = args.keyOf(report);
		const existing = buckets.get(key);

		if (existing) {
			existing.amount += amount;
			existing.count += 1;
		} else {
			buckets.set(key, { label: args.labelOf(report), amount, count: 1 });
		}
	}

	return buckets;
}

/**
 * Ranks bucketed breakdown entries by amount descending and caps them at
 * `MAX_BREAKDOWN_ROWS` — the buckets are built from an unordered `Map`
 * (insertion order), so callers must not rely on iteration order. Ties break
 * on `key` so the ranking is deterministic across requests regardless of the
 * unordered fetch that populated the buckets.
 */
function rankBuckets<K extends string, V extends Bucket>(
	buckets: Map<K, V>,
	limit = MAX_BREAKDOWN_ROWS,
): [K, V][] {
	return [...buckets.entries()]
		.sort(
			([keyA, a], [keyB, b]) => b.amount - a.amount || keyA.localeCompare(keyB),
		)
		.slice(0, limit);
}

async function reportsWithSums(args: {
	repo: ReportingRepository;
	db: PrismaClient;
	organizationId: string;
	filters: ReportingFilterInput["filters"];
}): Promise<{ reports: ReportingReportRow[]; sums: Map<string, number> }> {
	const where = reportingWhere({
		organizationId: args.organizationId,
		filters: args.filters,
	});
	const reports = await args.repo.matchingReports(args.db, where);
	const sums = await args.repo.expenseSumsByReport(
		args.db,
		reports.map((report) => report.id),
	);
	return { reports, sums };
}

/** Shared by `overview` and `byStatus` so both don't independently re-fetch and re-bucket the same data. */
async function statusBuckets(
	repo: ReportingRepository,
	ctx: ReportingServiceContext,
	input: ReportingFilterInput,
): Promise<Map<ReportStatus, Bucket>> {
	const { reports, sums } = await reportsWithSums({
		repo,
		db: ctx.db,
		organizationId: ctx.organizationId,
		filters: input.filters,
	});

	return bucketReportsBy({
		reports,
		sums,
		keyOf: (report) => report.status,
		labelOf: (report) => translateReportStatus(report.status),
	});
}

function flattenPdfFilters(filters: ReportingPdfFilterInput) {
	return {
		dateRange: filters.dateRange
			? {
					start: filters.dateRange.start.toISOString(),
					end: filters.dateRange.end.toISOString(),
				}
			: undefined,
		costUnitIds: filters.costUnitIds,
		ownerIds: filters.ownerIds,
		statuses: filters.statuses,
	};
}

export function createReportingService(deps: { repo: ReportingRepository }) {
	const { repo } = deps;

	return {
		async overview(
			ctx: ReportingServiceContext,
			input: ReportingFilterInput,
		): Promise<ReportingOverviewDTO> {
			const byStatus = await statusBuckets(repo, ctx, input);

			// "Submitted" = claimed across every status (draft included), not money
			// that actually left the org — that's `totalReimbursed` (PAID only).
			const totalSubmitted = [...byStatus.values()].reduce(
				(sum, bucket) => sum + bucket.amount,
				0,
			);

			return {
				totalSubmitted,
				totalReimbursed: byStatus.get(ReportStatus.PAID)?.amount ?? 0,
				totalPending: byStatus.get(ReportStatus.PENDING_APPROVAL)?.amount ?? 0,
				totalRejected: byStatus.get(ReportStatus.REJECTED)?.amount ?? 0,
				reportCounts: {
					draft: byStatus.get(ReportStatus.DRAFT)?.count ?? 0,
					pendingApproval: byStatus.get(ReportStatus.PENDING_APPROVAL)?.count ?? 0,
					needsRevision: byStatus.get(ReportStatus.NEEDS_REVISION)?.count ?? 0,
					accepted: byStatus.get(ReportStatus.ACCEPTED)?.count ?? 0,
					rejected: byStatus.get(ReportStatus.REJECTED)?.count ?? 0,
					paid: byStatus.get(ReportStatus.PAID)?.count ?? 0,
				},
			};
		},

		/**
		 * Deliberately takes its own startDate/endDate/granularity/metric, not the
		 * shared recursive filter tree the other reporting endpoints take — this
		 * mirrors the per-user dashboard's existing time-series contract exactly.
		 * A chart wired to this endpoint will show unfiltered org-wide totals even
		 * if sibling breakdown cards on the same page have cost-unit/owner/status
		 * filters applied; that's an intentional scope limit, not an oversight.
		 */
		async timeSeries(
			ctx: ReportingServiceContext,
			input: ReportingTimeSeriesInput,
		): Promise<ReportingTimeSeriesDTO> {
			const from = startOfPeriod(input.startDate, input.granularity);
			const periods = buildPeriodSeries(from, input.endDate, input.granularity);
			const args = {
				organizationId: ctx.organizationId,
				from,
				to: input.endDate,
				granularity: input.granularity,
			};

			const [rows, total] =
				input.metric === "submitted"
					? await Promise.all([
							repo.submittedSeries(ctx.db, args),
							repo.submittedTotal(ctx.db, args),
						])
					: await Promise.all([
							repo.reimbursedSeries(ctx.db, args),
							repo.reimbursedTotal(ctx.db, args),
						]);

			return { series: fillPeriodGaps(periods, rows), total };
		},

		async byStatus(
			ctx: ReportingServiceContext,
			input: ReportingFilterInput,
		): Promise<ReportingBreakdownDTO> {
			const buckets = await statusBuckets(repo, ctx, input);

			return rankBuckets(buckets).map(([status, bucket]) => ({
				key: status,
				label: translateReportStatus(status),
				amount: bucket.amount,
				count: bucket.count,
			}));
		},

		async byCostUnit(
			ctx: ReportingServiceContext,
			input: ReportingFilterInput,
		): Promise<ReportingBreakdownDTO> {
			const { reports, sums } = await reportsWithSums({
				repo,
				db: ctx.db,
				organizationId: ctx.organizationId,
				filters: input.filters,
			});
			const buckets = bucketReportsBy({
				reports,
				sums,
				keyOf: (report) => report.costUnitId,
				labelOf: (report) => `${report.costUnit.tag} · ${report.costUnit.title}`,
			});

			return rankBuckets(buckets).map(([key, bucket]) => ({
				key,
				label: bucket.label,
				amount: bucket.amount,
				count: bucket.count,
			}));
		},

		async byMember(
			ctx: ReportingServiceContext,
			input: ReportingFilterInput,
		): Promise<ReportingBreakdownDTO> {
			const { reports, sums } = await reportsWithSums({
				repo,
				db: ctx.db,
				organizationId: ctx.organizationId,
				filters: input.filters,
			});
			const buckets = bucketReportsBy({
				reports,
				sums,
				keyOf: (report) => report.ownerId,
				labelOf: (report) => report.owner.name,
			});

			return rankBuckets(buckets).map(([key, bucket]) => ({
				key,
				label: bucket.label,
				amount: bucket.amount,
				count: bucket.count,
			}));
		},

		/**
		 * Unlike byStatus/byCostUnit/byMember, expense type lives on `Expense`
		 * itself (not a `Report` attribute), so this groups DB-side in one step
		 * via `repo.byExpenseType` instead of going through `reportsWithSums`.
		 */
		async byExpenseType(
			ctx: ReportingServiceContext,
			input: ReportingFilterInput,
		): Promise<ReportingBreakdownDTO> {
			const where = reportingWhere({
				organizationId: ctx.organizationId,
				filters: input.filters,
			});
			const rows = await repo.byExpenseType(ctx.db, where);

			return rows.map((row) => ({
				key: row.type,
				label: translateExpenseType(row.type),
				amount: row.amount,
				count: row.count,
			}));
		},

		async export(
			ctx: ReportingServiceContext,
			input: ReportingFilterInput,
		): Promise<ReportingExportDTO> {
			const where = reportingWhere({
				organizationId: ctx.organizationId,
				filters: input.filters,
			});
			const rows = await repo.exportRows(ctx.db, where);

			return rows.map((row) => ({
				...row,
				expenseAmount: decimalToNumber(row.expenseAmount),
			}));
		},

		async exportToPdf(
			ctx: ReportingServiceContext,
			input: ReportingPdfFilterInput,
		): Promise<ReportingPdfExportResult> {
			const response = await fetch(`${env.API_URL}/pdf/reporting`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Service-Key": env.INTERNAL_API_SECRET,
					"X-User-Id": ctx.userId,
					"X-Organization-Id": ctx.organizationId,
					"X-Member-Role": ctx.orgRole,
				},
				body: JSON.stringify(flattenPdfFilters(input)),
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				const message =
					typeof body === "object" && body !== null && "error" in body
						? String((body as { error: unknown }).error)
						: "PDF generation failed";
				throw new TRPCError({
					code: response.status === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
					message,
				});
			}

			return (await response.json()) as ReportingPdfExportResult;
		},
	};
}

export type ReportingService = ReturnType<typeof createReportingService>;

export const reportingService = createReportingService({
	repo: reportingRepository,
});
