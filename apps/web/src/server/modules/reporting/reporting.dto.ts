import { ExpenseType, ReportStatus } from "@zemio/db";
import { z } from "zod";
import {
	granularitySchema,
	statSeriesSchema,
} from "@/server/modules/dashboard";

export type { Granularity } from "@/server/modules/dashboard";
export { granularitySchema };

export const reportingTimeSeriesMetricSchema = z.enum([
	"submitted",
	"reimbursed",
]);
export type ReportingTimeSeriesMetric = z.infer<
	typeof reportingTimeSeriesMetricSchema
>;

const MAX_TIME_SERIES_RANGE_DAYS = 366;

export const reportingTimeSeriesInputSchema = z
	.object({
		startDate: z.date(),
		endDate: z.date(),
		granularity: granularitySchema,
		metric: reportingTimeSeriesMetricSchema,
	})
	.refine((v) => v.startDate < v.endDate, {
		message: "startDate must be before endDate",
		path: ["startDate"],
	})
	.refine(
		(v) =>
			(v.endDate.getTime() - v.startDate.getTime()) / 86_400_000 <=
			MAX_TIME_SERIES_RANGE_DAYS,
		{
			message: `Date range must not exceed ${MAX_TIME_SERIES_RANGE_DAYS} days`,
			path: ["endDate"],
		},
	);
export type ReportingTimeSeriesInput = z.infer<
	typeof reportingTimeSeriesInputSchema
>;

/** Org-wide time series — same shape as the per-user dashboard's `StatSeries`. */
export const reportingTimeSeriesDTOSchema = statSeriesSchema;
export type ReportingTimeSeriesDTO = z.infer<
	typeof reportingTimeSeriesDTOSchema
>;

export const reportingOverviewDTOSchema = z.object({
	/** Sum across every matching report regardless of status — "claimed", not "paid out". */
	totalSubmitted: z.number(),
	totalReimbursed: z.number(),
	totalPending: z.number(),
	totalRejected: z.number(),
	reportCounts: z.object({
		draft: z.number(),
		pendingApproval: z.number(),
		needsRevision: z.number(),
		accepted: z.number(),
		rejected: z.number(),
		paid: z.number(),
	}),
});
export type ReportingOverviewDTO = z.infer<typeof reportingOverviewDTOSchema>;

/** Every "by…" breakdown returns at most this many rows, ranked by amount desc. */
export const MAX_BREAKDOWN_ROWS = 5;

/** One row of a grouped breakdown (by cost unit / member / expense type / status). */
export const reportingBreakdownRowSchema = z.object({
	key: z.string(),
	label: z.string(),
	amount: z.number(),
	count: z.number(),
});
export type ReportingBreakdownRow = z.infer<typeof reportingBreakdownRowSchema>;

export const reportingBreakdownDTOSchema = z.array(reportingBreakdownRowSchema);
export type ReportingBreakdownDTO = z.infer<typeof reportingBreakdownDTOSchema>;

/** One itemized row of the CSV export — one row per expense. */
export const reportingExportRowSchema = z.object({
	reportId: z.string(),
	reportTag: z.number(),
	reportTitle: z.string(),
	reportStatus: z.nativeEnum(ReportStatus),
	ownerName: z.string(),
	costUnitTag: z.string(),
	costUnitTitle: z.string(),
	expenseId: z.string(),
	expenseType: z.nativeEnum(ExpenseType),
	expenseDescription: z.string().nullable(),
	expenseAmount: z.number(),
	expenseStartDate: z.date(),
	expenseEndDate: z.date(),
});
export type ReportingExportRow = z.infer<typeof reportingExportRowSchema>;

export const reportingExportDTOSchema = z.array(reportingExportRowSchema);
export type ReportingExportDTO = z.infer<typeof reportingExportDTOSchema>;

/**
 * Deliberately flat — the PDF is an aggregate snapshot, not a filtered table, so
 * it doesn't need the full recursive filter-tree DSL the report list/other
 * reporting endpoints use. This is also the exact shape sent over the wire to
 * `apps/api`'s PDF service, which has no copy of the filter-tree compiler.
 */
const pdfDateRangeSchema = z
	.object({ start: z.date(), end: z.date() })
	.refine((range) => range.start <= range.end, {
		message: "Date range start must be before or equal to end",
		path: ["end"],
	});

export const reportingPdfFilterInputSchema = z.object({
	dateRange: pdfDateRangeSchema.optional(),
	costUnitIds: z.array(z.string()).optional(),
	ownerIds: z.array(z.string()).optional(),
	statuses: z.array(z.nativeEnum(ReportStatus)).optional(),
});
export type ReportingPdfFilterInput = z.infer<
	typeof reportingPdfFilterInputSchema
>;

export const reportingPdfExportResultSchema = z.object({
	url: z.string(),
	filename: z.string(),
});
export type ReportingPdfExportResult = z.infer<
	typeof reportingPdfExportResultSchema
>;
