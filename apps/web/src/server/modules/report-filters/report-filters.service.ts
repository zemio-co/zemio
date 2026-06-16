import type { PrismaClient } from "@zemio/db";
import {
	type ReportFiltersRepository,
	reportFiltersRepository,
} from "./report-filters.repository";

export type ReportFiltersContext = {
	db: PrismaClient;
	organizationId: string;
};

/** Filter dropdown options for the admin report list. Not a projection of Report itself. */
export type ReportFilterOptionsDTO = {
	costUnits: Array<{ label: string; value: string }>;
	owners: Array<{ label: string; value: string; image: string | null }>;
};

export function createReportFiltersService(deps: {
	repo: ReportFiltersRepository;
}) {
	const { repo } = deps;

	return {
		async options(ctx: ReportFiltersContext): Promise<ReportFilterOptionsDTO> {
			const [costUnits, owners] = await repo.findSources(
				ctx.db,
				ctx.organizationId,
			);

			return {
				costUnits: costUnits.map((costUnit) => ({
					label: costUnit.tag,
					value: costUnit.tag,
				})),
				owners: owners.map((owner) => ({
					label: owner.name,
					value: owner.email,
					image: owner.image,
				})),
			};
		},
	};
}

export type ReportFiltersService = ReturnType<
	typeof createReportFiltersService
>;

export const reportFiltersService = createReportFiltersService({
	repo: reportFiltersRepository,
});
