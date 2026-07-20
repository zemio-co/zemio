"use client";

import { CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReviewLoadState, ReviewReadModel } from "./review-types";

type ReviewDetailsSummary = ReviewReadModel["bankingSummary"];

const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
	currency: "EUR",
	style: "currency",
});

function ReviewDetails({
	bankingSummary,
	className,
	errorMessage,
	loading,
	totalAmount,
	...props
}: React.ComponentProps<"div"> & {
	bankingSummary?: ReviewDetailsSummary;
	totalAmount?: number;
} & ReviewLoadState) {
	const t = useTranslations("modules.review.details");

	if (loading) {
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

	if (errorMessage || !bankingSummary || totalAmount === undefined) {
		return (
			<div
				className={cn(
					"flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10",
					className,
				)}
			>
				<p className="text-center font-medium text-destructive text-sm">
					{t("loadErrorTitle")}
				</p>
				<p className="text-center text-xs">{errorMessage ?? t("unknownError")}</p>
			</div>
		);
	}

	return (
		<div
			className={cn("grid gap-6", className)}
			data-slot="review-details"
			{...props}
		>
			<DetailCard
				title={t("totalCostLabel")}
				value={EUR_FORMATTER.format(totalAmount)}
			/>
			<DetailCard title={t("ibanLabel")} value={bankingSummary.iban} />
			<DetailCard title={t("accountNameLabel")} value={bankingSummary.ownerName} />
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
	const t = useTranslations("modules.review.details");
	const handleCopy = React.useCallback(() => {
		navigator.clipboard.writeText(value);
		toast.info(t("copiedToClipboard", { title }));
	}, [value, title, t]);

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
