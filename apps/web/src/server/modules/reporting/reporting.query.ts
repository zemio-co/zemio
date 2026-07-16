import type { Prisma } from "@zemio/db";
import { z } from "zod";
import {
	buildReportListWhere,
	checkFilterGroupLimits,
	type ReportListFilterGroup,
	reportListFilterGroupSchema,
} from "@/server/modules/report";

/**
 * Shared input every reporting procedure takes. Reporting is always org-wide
 * (no `own` scope, unlike the report list), so there is no `scope` field here.
 * Reuses the report list's rule-count/nesting-depth limits so reporting
 * doesn't accept an unbounded filter tree.
 */
export const reportingFilterInputSchema = z
	.object({
		filters: reportListFilterGroupSchema.optional(),
	})
	.superRefine((input, ctx) => checkFilterGroupLimits(input.filters, ctx));

export type ReportingFilterInput = z.infer<typeof reportingFilterInputSchema>;

/**
 * Compiles the reporting filter tree into a Prisma where-clause, always scoped
 * to the whole organization. Reuses `buildReportListWhere`'s `"all"` branch
 * instead of re-implementing the filter compiler.
 */
export function reportingWhere(args: {
	organizationId: string;
	filters?: ReportListFilterGroup;
}): Prisma.ReportWhereInput {
	return buildReportListWhere({
		scope: "all",
		filters: args.filters,
		organizationId: args.organizationId,
		userId: "",
	});
}
