import { ReportStatus } from "@zemio/db";
import { z } from "zod";

/**
 * Deliberately flat, not the report list's recursive filter-tree DSL — the
 * reporting PDF is an aggregate snapshot, not a filtered table, and this app
 * has no copy of that filter-tree compiler. Mirrors
 * `apps/web`'s `reportingPdfFilterInputSchema` exactly.
 */
export const reportingPdfRequestSchema = z.object({
	dateRange: z
		.object({ start: z.coerce.date(), end: z.coerce.date() })
		.refine((range) => range.start <= range.end, {
			message: "Date range start must be before or equal to end",
			path: ["end"],
		})
		.optional(),
	costUnitIds: z.array(z.string()).optional(),
	ownerIds: z.array(z.string()).optional(),
	statuses: z.array(z.nativeEnum(ReportStatus)).optional(),
});

export type ReportingPdfRequest = z.infer<typeof reportingPdfRequestSchema>;
