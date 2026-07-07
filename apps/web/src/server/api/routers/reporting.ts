import { createTRPCRouter, orgAdminProcedure } from "@/server/api/trpc";
import {
	reportingFilterInputSchema,
	reportingPdfFilterInputSchema,
	reportingService,
	reportingTimeSeriesInputSchema,
	toReportingServiceContext,
} from "@/server/modules/reporting";

export const reportingRouter = createTRPCRouter({
	overview: orgAdminProcedure
		.input(reportingFilterInputSchema)
		.query(({ ctx, input }) =>
			reportingService.overview(toReportingServiceContext(ctx), input),
		),

	timeSeries: orgAdminProcedure
		.input(reportingTimeSeriesInputSchema)
		.query(({ ctx, input }) =>
			reportingService.timeSeries(toReportingServiceContext(ctx), input),
		),

	byStatus: orgAdminProcedure
		.input(reportingFilterInputSchema)
		.query(({ ctx, input }) =>
			reportingService.byStatus(toReportingServiceContext(ctx), input),
		),

	byCostUnit: orgAdminProcedure
		.input(reportingFilterInputSchema)
		.query(({ ctx, input }) =>
			reportingService.byCostUnit(toReportingServiceContext(ctx), input),
		),

	byMember: orgAdminProcedure
		.input(reportingFilterInputSchema)
		.query(({ ctx, input }) =>
			reportingService.byMember(toReportingServiceContext(ctx), input),
		),

	byExpenseType: orgAdminProcedure
		.input(reportingFilterInputSchema)
		.query(({ ctx, input }) =>
			reportingService.byExpenseType(toReportingServiceContext(ctx), input),
		),

	exportToPdf: orgAdminProcedure
		.input(reportingPdfFilterInputSchema)
		.mutation(({ ctx, input }) =>
			reportingService.exportToPdf(toReportingServiceContext(ctx), input),
		),
});
