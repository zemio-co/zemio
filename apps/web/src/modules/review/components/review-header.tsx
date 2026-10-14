"use client";

import type { ReportStatus } from "@zemio/db";
import { Skeleton } from "@zemio/ui";
import {
	BanknoteArrowDownIcon,
	ChevronDownIcon,
	CornerDownRightIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { StatusIcons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ReviewActions } from "./review-actions";
import { ReviewPay } from "./review-pay";

function ExpensesHeader({
	className,
	reportId,
	...props
}: React.ComponentProps<"header"> & {
	reportId: string;
}) {
	const tHeader = useTranslations("modules.review.header");
	const {
		data: review,
		error,
		isPending,
	} = api.report.review.useQuery({
		id: reportId,
	});

	if (isPending) {
		return <HeaderLoading className={className} {...props} />;
	}

	const errorMessage = error?.message;
	const report = review?.report;

	if (errorMessage) {
		return (
			<header
				className={cn("flex flex-col items-start gap-1", className)}
				data-slot="expenses-header-error"
				{...props}
			>
				<p className="font-medium text-destructive text-sm">
					{tHeader("loadErrorTitle")}
				</p>
				<p className="text-muted-foreground text-xs">{errorMessage}</p>
			</header>
		);
	}

	if (!report) {
		return null;
	}

	return (
		<header className={cn("", className)} data-slot="review-header" {...props}>
			<HeaderStatusIcon status={report.status} />
			<div className="mt-8">
				<h1 className="font-semibold text-2xl text-base-800">
					<span className="me-2 text-base-500">#{report.tag} </span>
					{report.title}
				</h1>
				<div className="mt-2 flex items-start justify-start gap-2">
					<CornerDownRightIcon className="mt-0.5 size-3.5 shrink-0 text-base-400" />
					<p className="max-w-prose text-base-500 text-sm">
						{report.description ? (
							report.description
						) : (
							<span className="italic">{tHeader("noDescription")}</span>
						)}
					</p>
				</div>
			</div>
			<div className="mt-8 flex w-full flex-col gap-2 sm:hidden">
				<ReviewActions disableAnimation report={review.report} size="sm">
					{tHeader("editAction")}
					<ChevronDownIcon />
				</ReviewActions>

				<ReviewPay
					disableAnimation
					disabled={
						review.report.status !== "ACCEPTED" &&
						review.report.status !== "PENDING_APPROVAL"
					}
					reportId={reportId}
					size="sm"
				>
					<BanknoteArrowDownIcon /> {tHeader("payAction")}
				</ReviewPay>
			</div>
		</header>
	);
}

function HeaderStatusIcon({
	className,
	status,
	...props
}: React.ComponentProps<"div"> & { status: ReportStatus }) {
	const StatusIcon = StatusIcons[status];

	return (
		<div
			className={cn(
				"flex size-10 items-center justify-center rounded-sm",
				status === "DRAFT" && "bg-base-500",
				status === "PENDING_APPROVAL" && "bg-yellow-500 text-yellow-50",
				status === "NEEDS_REVISION" && "bg-orange-500 text-orange-50",
				status === "REJECTED" && "bg-red-500 text-red-50",
				status === "ACCEPTED" && "bg-green-500 text-green-50",
				status === "PAID" && "bg-lime-500 text-lime-50",
				className,
			)}
			data-slot="component"
			{...props}
		>
			<StatusIcon className="size-5" />
		</div>
	);
}

function HeaderLoading({
	className,
	...props
}: React.ComponentProps<"header">) {
	return (
		<header
			className={cn("flex flex-wrap items-start justify-start gap-6", className)}
			data-slot="header-loading"
			{...props}
		>
			<Skeleton className="size-8 md:size-10" />
			<div className="grow">
				<Skeleton className="h-10 w-full max-w-96" />
				<Skeleton className="mt-2 h-6 w-full max-w-64" />
			</div>
			<Skeleton className="h-8 w-32" />
		</header>
	);
}

export { ExpensesHeader };
