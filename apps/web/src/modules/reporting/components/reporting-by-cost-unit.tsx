"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useUpdateTimer } from "../hooks/use-update-timer";
import { useReportingStore } from "../state/reporting.store";
import {
	ReportingCard,
	ReportingCardBody,
	ReportingCardDescription,
	ReportingCardEmpty,
	ReportingCardFooter,
	ReportingCardHeader,
	ReportingCardTitle,
} from "./reporting-card";

function ReportingByCostUnitCard({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.reporting.byCostUnit");
	const tCommon = useTranslations("modules.reporting.common");

	const updateTimer = useUpdateTimer();

	const dates = useReportingStore((state) => state.dates);

	const query = api.reporting.byCostUnit.useQuery(
		{
			filters: {
				logic: "and",
				rules: [
					{
						field: "createdAt",
						op: "between",
						value: {
							start: dates.start,
							end: dates.end,
						},
					},
				],
			},
		},
		{
			placeholderData: keepPreviousData,
		},
	);

	const sum = React.useMemo(() => {
		return (query.data ?? []).reduce((total, row) => total + row.amount, 0);
	}, [query.data]);

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
				data-slot="reporting-cost-units"
				{...props}
			>
				<p className="mb-3 font-semibold text-slate-700 text-xs">
					{t("loadingTitle")}
				</p>
				<Skeleton className="h-8 w-16" />

				<div className="mt-4 space-y-2">
					{[1, 2, 3, 4, 5].map((row) => (
						<Skeleton className="h-8 w-full" key={row} />
					))}
				</div>
			</div>
		);
	}

	if (query.error) {
		return <p>{tCommon("loadError")}</p>;
	}

	const { data } = query;

	return (
		<ReportingCard
			className={className}
			data-fetching={query.isFetching}
			data-slot="reporting-cost-units"
			{...props}
		>
			<ReportingCardHeader>
				<ReportingCardDescription>{t("description")}</ReportingCardDescription>
				<ReportingCardTitle
					tooltip={t.rich("tooltip", {
						count: data.length,
						amount: `€${sum.toFixed(2)}`,
						highlight: (chunks) => <span className="text-violet-600">{chunks}</span>,
					})}
				>
					€{sum.toFixed(2)}
				</ReportingCardTitle>
			</ReportingCardHeader>
			{data.length === 0 ? (
				<ReportingCardEmpty />
			) : (
				<ReportingCardBody>
					<ul>
						{data.map((row) => (
							<li
								className="flex items-center justify-start gap-3 border-slate-200 border-b py-3 text-sm *:whitespace-nowrap first:pt-0 last:border-b-0 last:pb-0"
								key={row.key}
							>
								<TagIcon className="size-3.5 text-slate-500" />
								<span className="truncate text-slate-700">{row.label}</span>
								<span className="ml-auto shrink-0 font-semibold text-slate-800">
									€{row.amount.toFixed(2)}
								</span>
							</li>
						))}
					</ul>
				</ReportingCardBody>
			)}
			<ReportingCardFooter>
				<span>{tCommon("lastUpdated", { time: updateTimer.label })}</span>
			</ReportingCardFooter>
		</ReportingCard>
	);
}

export { ReportingByCostUnitCard };
