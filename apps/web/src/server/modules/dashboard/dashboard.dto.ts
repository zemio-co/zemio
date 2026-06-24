import { z } from "zod";

export const granularitySchema = z.enum(["day", "week", "month"]);
export type Granularity = z.infer<typeof granularitySchema>;

const MAX_STAT_RANGE_DAYS = 366;

export const getStatInputSchema = z
	.object({
		startDate: z.date(),
		endDate: z.date(),
		granularity: granularitySchema,
	})
	.refine((v) => v.startDate < v.endDate, {
		message: "startDate must be before endDate",
		path: ["startDate"],
	})
	.refine(
		(v) =>
			(v.endDate.getTime() - v.startDate.getTime()) / 86_400_000 <=
			MAX_STAT_RANGE_DAYS,
		{
			message: `Date range must not exceed ${MAX_STAT_RANGE_DAYS} days`,
			path: ["endDate"],
		},
	);
export type GetStatInput = z.infer<typeof getStatInputSchema>;

export const statsDataPointSchema = z.object({
	periodStart: z.date(),
	amount: z.number(),
});
export type StatsDataPoint = z.infer<typeof statsDataPointSchema>;

export const statSeriesSchema = z.object({
	series: z.array(statsDataPointSchema),
	total: z.number(),
});
export type StatSeries = z.infer<typeof statSeriesSchema>;

export const reportCountResultSchema = z.object({ count: z.number() });
export type ReportCountResult = z.infer<typeof reportCountResultSchema>;
