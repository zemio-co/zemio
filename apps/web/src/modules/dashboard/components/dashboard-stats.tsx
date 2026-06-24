"use client";

import { Select as SelectPrimitive } from "@base-ui/react";
import { format, subDays } from "date-fns";
import React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
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
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function DashboardStats({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("grid grid-cols-3 gap-8", className)}
			data-slot="dashboard-stats"
			{...props}
		>
			<DashboardChart className="col-span-2" />
			<div className="pt-2">
				<DashboardCreatedReports />
				<Separator className={"my-8"} />
				<DashboardAcceptedReports />
			</div>
		</div>
	);
}

export const description = "A linear line chart";

const _statistics = [
	{
		value: "submitted",
		label: "Ausgegeben",
	},
	{
		value: "reimbursed",
		label: "Erstattet",
	},
];

type DashboardStat = "submitted" | "reimbursed";

const chartConfig = {
	amount: {
		label: "Betrag",
		color: "var(--color-violet-600)",
	},
} satisfies ChartConfig;

function DashboardChart({ className, ...props }: React.ComponentProps<"div">) {
	const [stat, setStat] = React.useState<DashboardStat>("submitted");

	const { startDate, endDate } = React.useMemo(
		() => ({ endDate: new Date(), startDate: subDays(new Date(), 14) }),
		[],
	);

	const submittedQuery = api.dashboard.submittedStats.useQuery({
		granularity: "day",
		endDate,
		startDate,
	});

	const reimbursedQuery = api.dashboard.reimbursedStats.useQuery({
		granularity: "day",
		endDate,
		startDate,
	});

	const activeQuery = stat === "submitted" ? submittedQuery : reimbursedQuery;

	if (activeQuery.isPending) {
		return (
			<div className={cn("", className)} data-slot="dashboard-chart" {...props}>
				<Skeleton className="mb-4 h-8 w-32" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	if (activeQuery.error) {
		return <p>Fehler</p>;
	}

	const { series, total } = activeQuery.data;

	const chartData = series.map((point) => ({
		date: format(point.periodStart, "dd.MM."),
		amount: point.amount,
	}));

	return (
		<div className={cn("", className)} data-slot="dashboard-chart" {...props}>
			<div className="flex -translate-x-2.5 items-center justify-start gap-2">
				<ChartStatSelector
					select={{
						value: stat,
						onValueChange(value) {
							setStat(value as DashboardStat);
						},
					}}
				/>
			</div>
			<div className="mt-2">
				<p className="font-medium text-slate-800 text-xl">
					{total.toFixed(2)} <span className="ml-1">€</span>
				</p>
			</div>
			<ChartContainer className="mt-6 h-48 w-full" config={chartConfig}>
				<LineChart
					accessibilityLayer
					data={chartData}
					margin={{
						left: 12,
						right: 12,
					}}
				>
					<CartesianGrid vertical={false} />
					<XAxis axisLine={false} dataKey="date" tickLine={false} tickMargin={8} />
					<ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
					<Line
						dataKey="amount"
						dot={false}
						stroke="var(--color-amount)"
						strokeWidth={2}
						type="linear"
					/>
				</LineChart>
			</ChartContainer>
		</div>
	);
}

const statItems: { value: DashboardStat; label: string }[] = [
	{
		value: "submitted",
		label: "Ausgegeben",
	},
	{
		value: "reimbursed",
		label: "Erstattet",
	},
];

function ChartStatSelector({
	select,
	...props
}: React.ComponentProps<typeof Button> & {
	select: React.ComponentProps<typeof Select>;
}) {
	return (
		<Select items={statItems} {...select}>
			<SelectPrimitive.Trigger
				render={
					<Button
						className={"font-medium"}
						disableAnimation
						size={"sm"}
						variant={"ghost"}
						{...props}
					>
						<SelectValue placeholder="Wähle eine Statistik" />
					</Button>
				}
			/>
			<SelectContent alignItemWithTrigger={false}>
				<SelectGroup>
					{statItems.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function DashboardCreatedReports({
	className,
	...props
}: React.ComponentProps<"div">) {
	const query = api.dashboard.createdCount.useQuery();

	if (query.isPending) {
		return (
			<div
				className={cn("", className)}
				data-slot="dashboard-created-reports"
				{...props}
			>
				<Skeleton className="h-4 w-24" />
				<Skeleton className="mt-4 h-8 w-32" />
			</div>
		);
	}

	if (query.error) {
		return null;
	}

	const { data } = query;

	return (
		<div
			className={cn("", className)}
			data-slot="dashboard-created-reports"
			{...props}
		>
			<p className="font-medium text-slate-800 text-xs">Anträge eingereicht</p>
			<p className="mt-4 font-medium text-3xl text-slate-800">{data.count}</p>
			<p className="mt-2 text-slate-500 text-xs">In den letzten 365 Tagen</p>
		</div>
	);
}
function DashboardAcceptedReports({
	className,
	...props
}: React.ComponentProps<"div">) {
	const query = api.dashboard.acceptedCount.useQuery();

	if (query.isPending) {
		return (
			<div
				className={cn("", className)}
				data-slot="dashboard-accepted-reports"
				{...props}
			>
				<Skeleton className="h-4 w-24" />
				<Skeleton className="mt-4 h-8 w-32" />
			</div>
		);
	}

	if (query.error) {
		return null;
	}

	const { data } = query;

	return (
		<div
			className={cn("", className)}
			data-slot="dashboard-accepted-reports"
			{...props}
		>
			<p className="font-medium text-slate-800 text-xs">Anträge akzeptiert</p>
			<p className="mt-4 font-medium text-3xl text-slate-800">{data.count}</p>
			<p className="mt-2 text-slate-500 text-xs">In den letzten 365 Tagen</p>
		</div>
	);
}

export { DashboardStats };
