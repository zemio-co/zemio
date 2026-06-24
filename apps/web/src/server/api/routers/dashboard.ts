import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import {
	dashboardService,
	getStatInputSchema,
	toDashboardServiceContext,
} from "@/server/modules/dashboard";

export const dashboardRouter = createTRPCRouter({
	submittedStats: orgProcedure
		.input(getStatInputSchema)
		.query(({ ctx, input }) =>
			dashboardService.submittedStats(toDashboardServiceContext(ctx), input),
		),

	reimbursedStats: orgProcedure
		.input(getStatInputSchema)
		.query(({ ctx, input }) =>
			dashboardService.reimbursedStats(toDashboardServiceContext(ctx), input),
		),

	createdCount: orgProcedure.query(({ ctx }) =>
		dashboardService.createdCount(toDashboardServiceContext(ctx)),
	),

	acceptedCount: orgProcedure.query(({ ctx }) =>
		dashboardService.acceptedCount(toDashboardServiceContext(ctx)),
	),
});
