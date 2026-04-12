"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { StatsCard, StatsCardDescription } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export function ReportStats({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & { reportId: string }) {
	const [stats] = api.report.getDetails.useSuspenseQuery({ id: reportId });

	return (
		<div
			className={cn("grid gap-8 md:grid-cols-3", className)}
			data-slot="report-stats"
			{...props}
		>
			<ReportCopyStats
				textValue={`${stats.totalAmount.toFixed(2)} €`}
				title="Gesamtbetrag"
				value={stats.totalAmount}
			/>

			<ReportCopyStats textValue={stats.iban} title="IBAN" value={stats.iban} />
			<ReportCopyStats
				textValue={stats.ownerName}
				title="Kontoname"
				value={stats.ownerName}
			/>
		</div>
	);
}

export function ReportCopyStats({
	value,
	title,
	textValue = value.toString(),
	...props
}: Omit<React.ComponentProps<typeof StatsCard>, "title" | "value"> & {
	title: string;
	value: string | number;
	textValue?: string;
}) {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(value.toString());
		setIsCopied(true);
		setTimeout(() => {
			setIsCopied(false);
		}, 2000);
	}, [value]);

	return (
		<StatsCard {...props}>
			<StatsCardDescription>{title}</StatsCardDescription>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							className={"p-0 font-semibold text-lg"}
							onClick={handleCopy}
							variant={"ghost"}
						>
							{textValue}
						</Button>
					}
				/>
				<TooltipContent>{isCopied ? "Kopiert" : "Kopieren"}</TooltipContent>
			</Tooltip>
		</StatsCard>
	);
}
