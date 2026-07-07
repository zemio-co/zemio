import { type ExpenseType, type Prisma, ReportStatus } from "@zemio/db";
import { db } from "../../lib/db";
import type { ReportingPdfRequest } from "./reporting.validators";

export type ReportingStatusTotal = {
	status: ReportStatus;
	amount: number;
	count: number;
};

export type ReportingCostUnitTotal = {
	costUnitId: string;
	tag: string;
	title: string;
	amount: number;
	count: number;
};

export type ReportingExpenseTypeTotal = {
	type: ExpenseType;
	amount: number;
	count: number;
};

export interface ReportingPdfData {
	organizationName: string;
	generatedAt: Date;
	filters: ReportingPdfRequest;
	overview: {
		totalSubmitted: number;
		totalReimbursed: number;
		totalPending: number;
		totalRejected: number;
	};
	byStatus: ReportingStatusTotal[];
	byCostUnit: ReportingCostUnitTotal[];
	byExpenseType: ReportingExpenseTypeTotal[];
}

/**
 * Builds the Prisma where-clause directly from the flat filter shape — no
 * filter-tree compiler needed here (see reporting.validators.ts).
 */
function buildWhere(
	organizationId: string,
	filters: ReportingPdfRequest,
): Prisma.ReportWhereInput {
	return {
		organizationId,
		// `?.length` (not a truthiness check on the array) so an empty selection
		// is treated as "no filter", not as "match nothing".
		...(filters.costUnitIds?.length && {
			costUnitId: { in: filters.costUnitIds },
		}),
		...(filters.ownerIds?.length && { ownerId: { in: filters.ownerIds } }),
		...(filters.statuses?.length && { status: { in: filters.statuses } }),
		...(filters.dateRange && {
			createdAt: { gte: filters.dateRange.start, lte: filters.dateRange.end },
		}),
	};
}

/**
 * Duplicates a subset of `apps/web`'s reporting repository — unavoidable,
 * since `apps/api` is a separate deployable with its own Prisma client and
 * does not import `apps/web`'s server modules (see generateReportPdf in
 * ./service.ts, which independently re-queries Report rather than calling
 * into apps/web's report.repository).
 *
 * Only fetches what the aggregate PDF renders: overview totals, by-cost-unit,
 * and by-expense-type. By-member breakdown and itemized rows are deliberately
 * out of scope here — the CSV export already covers per-member/itemized
 * detail, and duplicating that would make the two exports redundant.
 */
export async function fetchReportingPdfData(
	organizationId: string,
	filters: ReportingPdfRequest,
): Promise<ReportingPdfData> {
	const where = buildWhere(organizationId, filters);

	const [organization, reports, expenseTypeTotals] = await Promise.all([
		db.organization.findUnique({
			where: { id: organizationId },
			select: { name: true },
		}),
		db.report.findMany({
			where,
			select: {
				id: true,
				status: true,
				costUnitId: true,
				costUnit: { select: { tag: true, title: true } },
			},
		}),
		db.expense.groupBy({
			by: ["type"],
			where: { report: where },
			_sum: { amount: true },
			_count: true,
		}),
	]);

	if (!organization) {
		throw Object.assign(new Error("Organization not found"), { status: 404 });
	}

	const reportIds = reports.map((report) => report.id);
	const expenseSums =
		reportIds.length > 0
			? await db.expense.groupBy({
					by: ["reportId"],
					where: { reportId: { in: reportIds } },
					_sum: { amount: true },
				})
			: [];
	const sumsByReport = new Map(
		expenseSums.map((row) => [row.reportId, row._sum.amount?.toNumber() ?? 0]),
	);

	const statusBuckets = new Map<
		ReportStatus,
		{ amount: number; count: number }
	>();
	const costUnitBuckets = new Map<
		string,
		{ tag: string; title: string; amount: number; count: number }
	>();

	for (const report of reports) {
		const amount = sumsByReport.get(report.id) ?? 0;

		const statusBucket = statusBuckets.get(report.status) ?? {
			amount: 0,
			count: 0,
		};
		statusBucket.amount += amount;
		statusBucket.count += 1;
		statusBuckets.set(report.status, statusBucket);

		const costUnitBucket = costUnitBuckets.get(report.costUnitId) ?? {
			tag: report.costUnit.tag,
			title: report.costUnit.title,
			amount: 0,
			count: 0,
		};
		costUnitBucket.amount += amount;
		costUnitBucket.count += 1;
		costUnitBuckets.set(report.costUnitId, costUnitBucket);
	}

	// "Submitted" = claimed across every status (draft included), not money
	// that actually left the org — that's totalReimbursed (ACCEPTED only).
	const totalSubmitted = [...statusBuckets.values()].reduce(
		(sum, bucket) => sum + bucket.amount,
		0,
	);

	return {
		organizationName: organization.name,
		generatedAt: new Date(),
		filters,
		overview: {
			totalSubmitted,
			totalReimbursed: statusBuckets.get(ReportStatus.ACCEPTED)?.amount ?? 0,
			totalPending: statusBuckets.get(ReportStatus.PENDING_APPROVAL)?.amount ?? 0,
			totalRejected: statusBuckets.get(ReportStatus.REJECTED)?.amount ?? 0,
		},
		byStatus: [...statusBuckets.entries()].map(([status, bucket]) => ({
			status,
			amount: bucket.amount,
			count: bucket.count,
		})),
		byCostUnit: [...costUnitBuckets.entries()].map(([costUnitId, bucket]) => ({
			costUnitId,
			tag: bucket.tag,
			title: bucket.title,
			amount: bucket.amount,
			count: bucket.count,
		})),
		byExpenseType: expenseTypeTotals.map((row) => ({
			type: row.type,
			amount: row._sum.amount?.toNumber() ?? 0,
			count: row._count,
		})),
	};
}
