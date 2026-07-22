"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { differenceInDays, format } from "date-fns";
import { useTranslations } from "next-intl";
import React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useUpdateTimer } from "../hooks/use-update-timer";
import { useReportingStore } from "../state/reporting.store";
import {
	ReportingCard,
	ReportingCardBody,
	ReportingCardDescription,
	ReportingCardFooter,
	ReportingCardHeader,
	ReportingCardTitle,
} from "./reporting-card";

function determineChartGranularity(
	start: Date,
	end: Date,
): "day" | "week" | "month" {
	let distance = differenceInDays(start, end);

	distance = distance * -1;

	if (distance >= 60) {
		return "month";
	}

	if (distance >= 14) {
		return "week";
	}

	return "day";
}

function ReportingReportsTimeline({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.reporting.timeline");
	const tCommon = useTranslations("modules.reporting.common");

	const timelineChartConfig = {
		amount: {
			label: t("chart.amountLabel"),
			color: "var(--color-violet-600)",
		},
	} satisfies ChartConfig;

	const [metric, setMetric] = React.useState<TimelineMetric>("submitted");

	const dates = useReportingStore((state) => state.dates);
	const updateTimer = useUpdateTimer();

	const query = api.reporting.timeSeries.useQuery(
		{
			metric,
			startDate: dates.start,
			endDate: dates.end,
			granularity: determineChartGranularity(dates.start, dates.end),
		},
		{
			placeholderData: keepPreviousData,
		},
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally remove updateTimer from dependency list to account for updates
	React.useEffect(() => {
		if (query.isSuccess && query.data) {
			updateTimer.reset();
		}
	}, [query.data, query.isSuccess]);

	if (query.isPending) {
		return (
			<div
				className={cn("rounded-sm bg-white p-4", className)}
				data-slot="reporting-timeline"
				{...props}
			>
				<Skeleton className="h-4 w-32" />
				<Skeleton className="mt-6 h-48 w-full" />
			</div>
		);
	}

	if (query.error) {
		return <p>{tCommon("loadError")}</p>;
	}

	const chartData = query.data.series.map((point) => ({
		date: format(point.periodStart, "dd.MM."),
		amount: point.amount,
	}));

	return (
		<ReportingCard
			className={className}
			data-fetching={query.isFetching}
			data-slot="reporting-timeline"
			{...props}
		>
			<ReportingCardHeader className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<ReportingCardDescription>{t("description")}</ReportingCardDescription>
					<ReportingCardTitle>€{query.data.total.toFixed(2)}</ReportingCardTitle>
				</div>
				<MetricSelector
					onValueChange={(v) => setMetric(v as TimelineMetric)}
					value={metric}
				/>
			</ReportingCardHeader>
			<ReportingCardBody>
				<ChartContainer className="mt-6 h-48 w-full" config={timelineChartConfig}>
					<LineChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 32,
							right: 32,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis axisLine={false} dataKey="date" tickLine={false} tickMargin={8} />
						<ChartTooltip
							content={<ChartTooltipContent hideLabel />}
							cursor={false}
						/>
						<Line
							dataKey="amount"
							dot={false}
							stroke="var(--color-amount)"
							strokeWidth={2}
							type="linear"
						/>
					</LineChart>
				</ChartContainer>
			</ReportingCardBody>
			<ReportingCardFooter>
				<span>{tCommon("lastUpdated", { time: updateTimer.label })}</span>
			</ReportingCardFooter>
		</ReportingCard>
	);
}

type TimelineMetric = "reimbursed" | "submitted";

function MetricSelector({ ...props }: React.ComponentProps<typeof Select>) {
	const t = useTranslations("modules.reporting.timeline");
	const metricItems = {
		reimbursed: t("metrics.reimbursed"),
		submitted: t("metrics.submitted"),
	};

	return (
		<Select items={metricItems} {...props}>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{Object.entries(metricItems).map(([key, label]) => (
						<SelectItem key={key} value={key}>
							{label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

export { ReportingReportsTimeline };
