import {
	type ExpenseType,
	Prisma,
	type PrismaClient,
	ReportStatus,
} from "@zemio/db";
import { reportRepository } from "@/server/modules/report";
import { nullableDecimalToNumber } from "@/server/shared/money";
import { type Granularity, MAX_BREAKDOWN_ROWS } from "./reporting.dto";

type Db = PrismaClient;

/** The universe of reports a breakdown/overview query operates over. */
export type ReportingReportRow = {
	id: string;
	costUnitId: string;
	ownerId: string;
	status: ReportStatus;
	costUnit: { tag: string; title: string };
	owner: { name: string };
};

type TimeSeriesArgs = {
	organizationId: string;
	from: Date;
	to: Date;
	granularity: Granularity;
};

type RawSeriesRow = { periodStart: Date; amount: number };

// Granularity is Zod-validated before reaching the repository, making
// Prisma.raw() safe to use here for the DATE_TRUNC interval argument.
function granularityLiteral(granularity: Granularity): Prisma.Sql {
	return Prisma.raw(`'${granularity}'`);
}

export type ExpenseTypeTotalRow = {
	type: ExpenseType;
	amount: number;
	count: number;
};

export type ReportingExportSourceRow = {
	reportId: string;
	reportTag: number;
	reportTitle: string;
	reportStatus: ReportStatus;
	ownerName: string;
	costUnitTag: string;
	costUnitTitle: string;
	expenseId: string;
	expenseType: ExpenseType;
	expenseDescription: string | null;
	expenseAmount: Prisma.Decimal;
	expenseStartDate: Date;
	expenseEndDate: Date;
};

export const reportingRepository = {
	/** All reports matching the filter, with the fields breakdowns/overview group by. */
	matchingReports(
		db: Db,
		where: Prisma.ReportWhereInput,
	): Promise<ReportingReportRow[]> {
		return db.report.findMany({
			where,
			select: {
				id: true,
				costUnitId: true,
				ownerId: true,
				status: true,
				costUnit: { select: { tag: true, title: true } },
				owner: { select: { name: true } },
			},
		});
	},

	/**
	 * Expense sums per report id — the DB-side aggregate that overview/breakdowns
	 * re-bucket by group. Reuses the report module's existing `sumByReportIds`
	 * query instead of re-declaring the same groupBy.
	 */
	async expenseSumsByReport(
		db: Db,
		reportIds: string[],
	): Promise<Map<string, number>> {
		const rows = await reportRepository.sumByReportIds(db, reportIds);

		return new Map(
			rows.map((row) => [row.reportId, nullableDecimalToNumber(row._sum.amount)]),
		);
	},

	/** Sum + count grouped by expense type — expense-scoped, no report join needed. */
	async byExpenseType(
		db: Db,
		where: Prisma.ReportWhereInput,
	): Promise<ExpenseTypeTotalRow[]> {
		const rows = await db.expense.groupBy({
			by: ["type"],
			where: { report: where },
			_sum: { amount: true },
			_count: true,
			orderBy: { _sum: { amount: "desc" } },
			take: MAX_BREAKDOWN_ROWS,
		});

		return rows.map((row) => ({
			type: row.type,
			amount: nullableDecimalToNumber(row._sum.amount),
			count: row._count,
		}));
	},

	submittedSeries(db: Db, args: TimeSeriesArgs): Promise<RawSeriesRow[]> {
		const gran = granularityLiteral(args.granularity);
		return db.$queryRaw<RawSeriesRow[]>`
			SELECT
				DATE_TRUNC(${gran}, r."createdAt" AT TIME ZONE 'UTC') AS "periodStart",
				SUM(e."amount")::float8 AS amount
			FROM "expense" e
			JOIN "report" r ON e."reportId" = r."id"
			WHERE r."organizationId" = ${args.organizationId}
				AND r."createdAt" >= ${args.from}
				AND r."createdAt" <= ${args.to}
			GROUP BY "periodStart"
			ORDER BY "periodStart"
		`;
	},

	reimbursedSeries(db: Db, args: TimeSeriesArgs): Promise<RawSeriesRow[]> {
		const gran = granularityLiteral(args.granularity);
		return db.$queryRaw<RawSeriesRow[]>`
			SELECT
				DATE_TRUNC(${gran}, r."paidAt" AT TIME ZONE 'UTC') AS "periodStart",
				SUM(e."amount")::float8 AS amount
			FROM "expense" e
			JOIN "report" r ON e."reportId" = r."id"
			WHERE r."organizationId" = ${args.organizationId}
				AND r."status" = 'PAID'::"ReportStatus"
				AND r."paidAt" >= ${args.from}
				AND r."paidAt" <= ${args.to}
			GROUP BY "periodStart"
			ORDER BY "periodStart"
		`;
	},

	submittedTotal(
		db: Db,
		args: Pick<TimeSeriesArgs, "organizationId" | "from" | "to">,
	): Promise<number> {
		return db.expense
			.aggregate({
				where: {
					report: {
						organizationId: args.organizationId,
						createdAt: { gte: args.from, lte: args.to },
					},
				},
				_sum: { amount: true },
			})
			.then((r) => nullableDecimalToNumber(r._sum.amount));
	},

	reimbursedTotal(
		db: Db,
		args: Pick<TimeSeriesArgs, "organizationId" | "from" | "to">,
	): Promise<number> {
		return db.expense
			.aggregate({
				where: {
					report: {
						organizationId: args.organizationId,
						status: ReportStatus.PAID,
						paidAt: { gte: args.from, lte: args.to },
					},
				},
				_sum: { amount: true },
			})
			.then((r) => nullableDecimalToNumber(r._sum.amount));
	},

	exportRows(
		db: Db,
		where: Prisma.ReportWhereInput,
	): Promise<ReportingExportSourceRow[]> {
		return db.expense
			.findMany({
				where: { report: where },
				select: {
					id: true,
					type: true,
					description: true,
					amount: true,
					startDate: true,
					endDate: true,
					report: {
						select: {
							id: true,
							tag: true,
							title: true,
							status: true,
							owner: { select: { name: true } },
							costUnit: { select: { tag: true, title: true } },
						},
					},
				},
				orderBy: { report: { createdAt: "desc" } },
			})
			.then((rows) =>
				rows.map((row) => ({
					reportId: row.report.id,
					reportTag: row.report.tag,
					reportTitle: row.report.title,
					reportStatus: row.report.status,
					ownerName: row.report.owner.name,
					costUnitTag: row.report.costUnit.tag,
					costUnitTitle: row.report.costUnit.title,
					expenseId: row.id,
					expenseType: row.type,
					expenseDescription: row.description,
					expenseAmount: row.amount,
					expenseStartDate: row.startDate,
					expenseEndDate: row.endDate,
				})),
			);
	},
} as const;

export type ReportingRepository = typeof reportingRepository;
