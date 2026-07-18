import { Prisma, type PrismaClient, ReportStatus } from "@zemio/db";
import { nullableDecimalToNumber } from "@/server/shared/money";
import type { Granularity } from "./dashboard.dto";

type Db = PrismaClient;

type StatQueryArgs = {
	organizationId: string;
	userId: string;
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

export const dashboardRepository = {
	submittedSeries(db: Db, args: StatQueryArgs): Promise<RawSeriesRow[]> {
		const gran = granularityLiteral(args.granularity);
		return db.$queryRaw<RawSeriesRow[]>`
			SELECT
				DATE_TRUNC(${gran}, r."createdAt" AT TIME ZONE 'UTC') AS "periodStart",
				SUM(e."amount")::float8 AS amount
			FROM "expense" e
			JOIN "report" r ON e."reportId" = r."id"
			WHERE r."ownerId" = ${args.userId}
				AND r."organizationId" = ${args.organizationId}
				AND r."createdAt" >= ${args.from}
				AND r."createdAt" <= ${args.to}
			GROUP BY "periodStart"
			ORDER BY "periodStart"
		`;
	},

	reimbursedSeries(db: Db, args: StatQueryArgs): Promise<RawSeriesRow[]> {
		const gran = granularityLiteral(args.granularity);
		return db.$queryRaw<RawSeriesRow[]>`
			SELECT
				DATE_TRUNC(${gran}, r."lastUpdatedAt" AT TIME ZONE 'UTC') AS "periodStart",
				SUM(e."amount")::float8 AS amount
			FROM "expense" e
			JOIN "report" r ON e."reportId" = r."id"
			WHERE r."ownerId" = ${args.userId}
				AND r."organizationId" = ${args.organizationId}
				AND r."status" = 'ACCEPTED'::"ReportStatus"
				AND r."lastUpdatedAt" >= ${args.from}
				AND r."lastUpdatedAt" <= ${args.to}
			GROUP BY "periodStart"
			ORDER BY "periodStart"
		`;
	},

	submittedTotal(db: Db, args: StatQueryArgs): Promise<number> {
		return db.expense
			.aggregate({
				where: {
					report: {
						ownerId: args.userId,
						organizationId: args.organizationId,
						createdAt: { gte: args.from, lte: args.to },
					},
				},
				_sum: { amount: true },
			})
			.then((r) => nullableDecimalToNumber(r._sum.amount));
	},

	reimbursedTotal(db: Db, args: StatQueryArgs): Promise<number> {
		return db.expense
			.aggregate({
				where: {
					report: {
						ownerId: args.userId,
						organizationId: args.organizationId,
						status: ReportStatus.PAID,
						lastUpdatedAt: { gte: args.from, lte: args.to },
					},
				},
				_sum: { amount: true },
			})
			.then((r) => nullableDecimalToNumber(r._sum.amount));
	},

	createdCount(
		db: Db,
		args: Pick<StatQueryArgs, "organizationId" | "userId" | "from">,
	): Promise<number> {
		return db.report.count({
			where: {
				ownerId: args.userId,
				organizationId: args.organizationId,
				createdAt: { gte: args.from },
			},
		});
	},

	acceptedCount(
		db: Db,
		args: Pick<StatQueryArgs, "organizationId" | "userId" | "from">,
	): Promise<number> {
		return db.report.count({
			where: {
				ownerId: args.userId,
				organizationId: args.organizationId,
				status: ReportStatus.ACCEPTED,
				lastUpdatedAt: { gte: args.from },
			},
		});
	},
} as const;

export type DashboardRepository = typeof dashboardRepository;
