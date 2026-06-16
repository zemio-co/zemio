import type { PrismaClient } from "@zemio/db";

type Db = PrismaClient;

export const reportFiltersRepository = {
	/** Distinct cost-unit tags and report owners within the org, for the report-list filter UI. */
	findSources(db: Db, organizationId: string) {
		return db.$transaction([
			db.costUnit.findMany({
				where: { organizationId },
				select: { id: true, tag: true },
				orderBy: { tag: "asc" },
			}),
			db.user.findMany({
				where: { ownReports: { some: { organizationId } } },
				select: { id: true, name: true, image: true },
				orderBy: { name: "asc" },
			}),
		]);
	},
} as const;

export type ReportFiltersRepository = typeof reportFiltersRepository;
