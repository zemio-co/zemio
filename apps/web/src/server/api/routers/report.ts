import { ReportStatus } from "@zemio/db";
import { z } from "zod";
import { createReportSchema } from "@/lib/validators";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
} from "@/server/api/trpc";
import {
	registerReportEmailSubscribers,
	reportListInputSchema,
	reportProcedure,
	reportService,
	toReportDetailDTO,
	toReportServiceContext,
} from "@/server/modules/report";

// Wire the email side-effects to the report event bus when the router loads.
registerReportEmailSubscribers();

export const reportRouter = createTRPCRouter({
	list: orgProcedure
		.input(reportListInputSchema)
		.query(({ ctx, input }) =>
			reportService.list(toReportServiceContext(ctx), input),
		),

	review: orgAdminProcedure
		.input(z.object({ id: z.string() }))
		.query(({ ctx, input }) =>
			reportService.review(toReportServiceContext(ctx), input),
		),

	byId: reportProcedure("read").query(({ ctx }) =>
		toReportDetailDTO(ctx.report),
	),

	financialSummary: orgProcedure
		.input(z.object({ id: z.string() }))
		.query(({ ctx, input }) =>
			reportService.financialSummary(toReportServiceContext(ctx), input),
		),

	create: orgProcedure
		.input(createReportSchema)
		.mutation(({ ctx, input }) =>
			reportService.create(toReportServiceContext(ctx), input),
		),

	update: reportProcedure("update")
		.input(
			z.object({
				title: z.string().min(1).optional(),
				description: z.string().optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			reportService.update(toReportServiceContext(ctx), ctx.report, {
				title: input.title,
				description: input.description,
			}),
		),

	delete: reportProcedure("delete").mutation(({ ctx }) =>
		reportService.remove(toReportServiceContext(ctx), ctx.report),
	),

	submit: reportProcedure("submit").mutation(({ ctx }) =>
		reportService.submit(toReportServiceContext(ctx), ctx.report),
	),

	transition: reportProcedure("transition")
		.input(
			z.object({
				status: z.nativeEnum(ReportStatus),
				notify: z.boolean().optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			reportService.transition(toReportServiceContext(ctx), ctx.report, {
				status: input.status,
				notify: input.notify,
			}),
		),

	exportToPdf: orgProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) =>
			reportService.exportToPdf(toReportServiceContext(ctx), input),
		),
});
