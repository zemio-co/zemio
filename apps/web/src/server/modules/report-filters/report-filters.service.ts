import type { PrismaClient } from "@zemio/db";
import {
	type ReportFiltersRepository,
	reportFiltersRepository,
} from "./report-filters.repository";

export type ReportFiltersContext = {
	db: PrismaClient;
	organizationId: string;
};

/**
 * Filter dropdown options for the admin report list. Not a projection of Report
 * itself. Values are ids (cost-unit id / user id) so they map directly onto the
 * report list filter DSL (`costUnitId` / `ownerId`); labels are display text.
 * `data` carries the full source entity so the frontend can render custom
 * option content (e.g. cost unit title, owner avatar) beyond label/value.
 */
export type ReportFilterOptionsDTO = {
	costUnits: Array<{
		label: string;
		value: string;
		data: { id: string; tag: string; title: string };
	}>;
	owners: Array<{
		label: string;
		value: string;
		data: { id: string; name: string; email: string; image: string | null };
	}>;
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
					value: costUnit.id,
					data: costUnit,
				})),
				owners: owners.map((owner) => ({
					label: owner.name,
					value: owner.id,
					data: owner,
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
