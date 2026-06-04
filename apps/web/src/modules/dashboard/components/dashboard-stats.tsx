"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
	currency: "EUR",
	style: "currency",
});

type StatsMetric = {
	amount: number;
	changePercent: number | null;
	comparisonPeriodStart: Date;
	periodStart: Date;
};

type StatsCardProps = React.ComponentProps<"div"> & {
	comparisonFormat: string;
	label: string;
	metric: StatsMetric;
	periodFormat: string;
};

function formatChangePercent(changePercent: number | null): string {
	if (changePercent === null) {
		return "Keine Vergleichsdaten";
	}

	if (changePercent > 0) {
		return `+${changePercent}%`;
	}

	return `${changePercent}%`;
}

function getChangeText(metric: StatsMetric, comparisonFormat: string): string {
	const formattedChange = formatChangePercent(metric.changePercent);

	if (metric.changePercent === null) {
		return formattedChange;
	}

	return `${formattedChange} zu ${format(metric.comparisonPeriodStart, comparisonFormat, { locale: de })}`;
}

function getChangeColor(changePercent: number | null): string {
	if (changePercent === null || changePercent === 0) {
		return "text-muted-foreground";
	}

	return changePercent > 0 ? "text-green-500" : "text-red-500";
}

function StatsCard({
	className,
	comparisonFormat,
	label,
	metric,
	periodFormat,
	...props
}: StatsCardProps) {
	const isPositiveChange =
		metric.changePercent !== null && metric.changePercent > 0;
	const TrendIcon = isPositiveChange ? ArrowUpIcon : ArrowDownIcon;

	return (
		<div className={cn("bg-white p-5", className)} {...props}>
			<div className="flex w-fit items-center justify-center gap-1.5">
				<CalendarIcon className="size-3.5 text-zinc-500" />
				<span className="block font-medium text-xs text-zinc-500">
					{label} in {format(metric.periodStart, periodFormat, { locale: de })}
				</span>
			</div>
			<p className="mt-6 font-medium text-foreground text-xl md:text-2xl">
				{EUR_FORMATTER.format(metric.amount)}
			</p>
			<div
				className={cn(
					"mt-2 flex items-center justify-start gap-1.5 text-sm",
					getChangeColor(metric.changePercent),
				)}
			>
				{metric.changePercent !== null && <TrendIcon className="size-3.5" />}
				<span className="block">{getChangeText(metric, comparisonFormat)}</span>
			</div>
		</div>
	);
}

function DashboardStats({ className, ...props }: React.ComponentProps<"div">) {
	const { data: stats, error, isPending } = api.dashboard.getStats.useQuery();

	if (isPending) {
		return <Skeleton className={cn("min-h-32 w-full", className)} {...props} />;
	}

	if (!stats || error) {
		return (
			<div
				className={cn(
					"flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-white px-6 py-10",
					className,
				)}
				data-slot="dashboard-stats"
				{...props}
			>
				<p className="text-center font-medium text-destructive text-sm">
					Fehler beim Laden der Statistik
				</p>
				<p className="text-center text-xs">
					{error?.message ?? "Ein unbekannter Fehler ist aufgetreten"}
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"grid gap-px rounded-lg bg-linear-to-b from-zinc-700/15 to-zinc-700/25 shadow-sm ring-1 ring-zinc-700/15 md:grid-cols-2",
				className,
			)}
			data-slot="dashboard-stats"
			{...props}
		>
			<StatsCard
				className="rounded-t-lg md:rounded-l-lg md:rounded-tr-none"
				comparisonFormat="MMMM"
				label="Ausgaben"
				metric={stats.monthlyExpenses}
				periodFormat="MMMM"
			/>
			<StatsCard
				className="rounded-b-lg md:rounded-r-lg md:rounded-l-none"
				comparisonFormat="yyyy"
				label="Erstattet"
				metric={stats.yearlyReimbursed}
				periodFormat="yyyy"
			/>
		</div>
	);
}

export { DashboardStats };
