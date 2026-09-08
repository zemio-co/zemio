import { z } from "zod";
import { createTRPCRouter, orgAdminProcedure } from "@/server/api/trpc";
import {
	datevExportPeriodSchema,
	datevExportService,
	toDatevExportServiceContext,
} from "@/server/modules/datev-export";

/**
 * Admin-only, like the review it follows on from. Deliberately not behind the
 * billing gate: ADR-0006 keeps an organization's data "visible and exportable
 * … for accounting, for audits", and a Buchungsstapel is that case exactly.
 */
export const datevExportRouter = createTRPCRouter({
	preview: orgAdminProcedure
		.input(datevExportPeriodSchema)
		.query(({ ctx, input }) =>
			datevExportService.preview(toDatevExportServiceContext(ctx), input),
		),

	/** Past exports, so a stored file stays reachable after its URL expires. */
	list: orgAdminProcedure.query(({ ctx }) =>
		datevExportService.list(toDatevExportServiceContext(ctx)),
	),

	download: orgAdminProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(({ ctx, input }) =>
			datevExportService.download(toDatevExportServiceContext(ctx), input),
		),

	create: orgAdminProcedure
		.input(datevExportPeriodSchema)
		.mutation(({ ctx, input }) =>
			datevExportService.create(toDatevExportServiceContext(ctx), input),
		),
});
