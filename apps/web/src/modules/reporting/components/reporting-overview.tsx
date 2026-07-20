"use client";

import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusIcons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useReportingStore } from "../state/reporting.store";
import {
	ReportingCard,
	ReportingCardBody,
	ReportingCardDescription,
	ReportingCardHeader,
	ReportingCardTitle,
} from "./reporting-card";

function ReportingOverviewCard({
	className,
	...props
}: React.ComponentProps<"div">) {
	const dates = useReportingStore((state) => state.dates);

	const query = api.reporting.overview.useQuery({
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
	});

	if (query.isPending) {
		return (
			<div
				className={cn("rounded-sm bg-white p-4", className)}
				data-slot="reporting-cost-units"
				{...props}
			>
				<p className="mb-3 font-semibold text-slate-700 text-xs">
					Antragsübersicht
				</p>

				<div className="mt-4 grid grid-cols-2 gap-4">
					{[1, 2, 3, 4, 5, 6].map((row) => (
						<Skeleton className="h-12 w-full" key={row} />
					))}
				</div>
			</div>
		);
	}

	if (query.error) {
		return <p>Error</p>;
	}

	const { data } = query;

	return (
		<ReportingCard
			className={className}
			data-slot="reporting-overview-card"
			{...props}
		>
			<ReportingCardHeader>
				<ReportingCardDescription>Antragsübersicht</ReportingCardDescription>
			</ReportingCardHeader>
			<ReportingCardBody className="grid gap-4 pb-4 sm:grid-cols-2">
				<div className="space-y-2">
					<p className="flex items-center justify-start gap-2 text-slate-500 text-sm">
						<StatusIcons.ACCEPTED className="size-3.5 text-slate-500" />
						Akzeptiert
					</p>
					<ReportingCardTitle className="**:data-[slot='card-title-content']:flex **:data-[slot='card-title-content']:items-center **:data-[slot='card-title-content']:gap-4">
						<span className={cn("block size-2.5 rounded-sm bg-green-500")} />
						{data.reportCounts.accepted}
					</ReportingCardTitle>
				</div>
				<div className="space-y-2">
					<p className="flex items-center justify-start gap-2 text-slate-500 text-sm">
						<StatusIcons.REJECTED className="size-3.5 text-slate-500" />
						Abgelehnt
					</p>
					<ReportingCardTitle className="**:data-[slot='card-title-content']:flex **:data-[slot='card-title-content']:items-center **:data-[slot='card-title-content']:gap-4">
						<span className={cn("block size-2.5 rounded-sm bg-red-500")} />
						{data.reportCounts.rejected}
					</ReportingCardTitle>
				</div>
				<div className="space-y-2">
					<p className="flex items-center justify-start gap-2 text-slate-500 text-sm">
						<StatusIcons.PENDING_APPROVAL className="size-3.5 text-slate-500" />
						Ausstehend
					</p>
					<ReportingCardTitle className="**:data-[slot='card-title-content']:flex **:data-[slot='card-title-content']:items-center **:data-[slot='card-title-content']:gap-4">
						<span className={cn("block size-2.5 rounded-sm bg-yellow-500")} />
						{data.reportCounts.pendingApproval}
					</ReportingCardTitle>
				</div>
				<div className="space-y-2">
					<p className="flex items-center justify-start gap-2 text-slate-500 text-sm">
						<StatusIcons.NEEDS_REVISION className="size-3.5 text-slate-500" />
						Revision angefordert
					</p>
					<ReportingCardTitle className="**:data-[slot='card-title-content']:flex **:data-[slot='card-title-content']:items-center **:data-[slot='card-title-content']:gap-4">
						<span className={cn("block size-2.5 rounded-sm bg-orange-500")} />
						{data.reportCounts.needsRevision}
					</ReportingCardTitle>
				</div>
				<div className="space-y-2">
					<p className="flex items-center justify-start gap-2 text-slate-500 text-sm">
						<StatusIcons.DRAFT className="size-3.5 text-slate-500" />
						Entwürfe
					</p>
					<ReportingCardTitle className="**:data-[slot='card-title-content']:flex **:data-[slot='card-title-content']:items-center **:data-[slot='card-title-content']:gap-4">
						<span className={cn("block size-2.5 rounded-sm bg-slate-500")} />
						{data.reportCounts.draft}
					</ReportingCardTitle>
				</div>
				<div className="space-y-2">
					<p className="flex items-center justify-start gap-2 text-slate-500 text-sm">
						<StatusIcons.PAID className="size-3.5 text-slate-500" />
						Ausgezahlt
					</p>
					<ReportingCardTitle className="**:data-[slot='card-title-content']:flex **:data-[slot='card-title-content']:items-center **:data-[slot='card-title-content']:gap-4">
						<span className={cn("block size-2.5 rounded-sm bg-green-500")} />
						{data.reportCounts.paid}
					</ReportingCardTitle>
				</div>
			</ReportingCardBody>
		</ReportingCard>
	);
}

export { ReportingOverviewCard };
