import { createTRPCRouter, orgAdminProcedure } from "@/server/api/trpc";
import { reportFiltersService } from "@/server/modules/report-filters";

export const reportFiltersRouter = createTRPCRouter({
	options: orgAdminProcedure.query(({ ctx }) =>
		reportFiltersService.options({
			db: ctx.db,
			organizationId: ctx.organizationId,
		}),
	),
});
