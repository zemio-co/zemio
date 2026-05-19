"use client";

import { CopyIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReviewDetails({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & {
	reportId: string;
}) {
	const { data, error, isPending } = api.report.getDetails.useQuery({
		id: reportId,
	});

	if (isPending) {
		return (
			<div
				className={cn("grid gap-6", className)}
				data-slot="review-details"
				{...props}
			>
				<Skeleton className="min-h-22" />
				<Skeleton className="min-h-22" />
				<Skeleton className="min-h-22" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div
				className={cn(
					"flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10",
					className,
				)}
			>
				<p className="text-center font-medium text-destructive text-sm">
					Details konnten nicht geladen werden
				</p>
				<p className="text-center text-xs">
					{error?.message ?? "Ein unbekannter Fehler ist aufgetreten"}
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn("grid gap-6", className)}
			data-slot="review-details"
			{...props}
		>
			<DetailCard title="Gesamtkosten" value={`${data.totalAmount}€`} />
			<DetailCard title="IBAN" value={data.iban} />
			<DetailCard title="Kontoname" value={data.ownerName} />
		</div>
	);
}

function DetailCard({
	className,
	title,
	value,
	...props
}: Omit<React.ComponentProps<"div">, "title"> & {
	title: string;
	value: string;
}) {
	const handleCopy = React.useCallback(() => {
		navigator.clipboard.writeText(value);
		toast.info(`${title} zum Clipboard kopiert`);
	}, [value, title]);

	return (
		<div
			className={cn(
				"space-y-4 rounded-lg bg-background p-4 shadow-sm ring-1 ring-zinc-700/15",
				className,
			)}
			data-slot="detail-card"
			{...props}
		>
			<div className="flex items-start justify-between">
				<p className="font-medium text-xs text-zinc-500">{title}</p>
				<Button
					className={"text-muted-foreground"}
					onClick={handleCopy}
					size={"icon-sm"}
					variant={"ghost"}
				>
					<CopyIcon />
				</Button>
			</div>
			<p className="truncate font-semibold text-lg text-zinc-800">{value}</p>
		</div>
	);
}

export { ReviewDetails };
