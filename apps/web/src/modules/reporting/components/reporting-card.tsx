"use client";

import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function ReportingCard({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("group/card flex flex-col rounded-lg bg-white", className)}
			data-slot="reporting-card"
			{...props}
		/>
	);
}

function ReportingCardHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("space-y-2 p-4", className)}
			data-slot="reporting-card-header"
			{...props}
		/>
	);
}

function ReportingCardDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("font-semibold text-slate-700 text-xs", className)}
			data-slot="reporting-card-description"
			{...props}
		/>
	);
}

function ReportingCardTitle({
	className,
	children,
	tooltip,
	...props
}: React.ComponentProps<"div"> & { tooltip?: ReactNode }) {
	return (
		<div
			className={cn(
				"flex items-center justify-start gap-2 font-semibold text-slate-800 text-xl",
				className,
			)}
			data-slot="reporting-card-title"
			{...props}
		>
			<p data-slot="card-title-content">{children}</p>
			{tooltip && (
				<Tooltip>
					<TooltipTrigger
						render={<InfoIcon className="size-3.5 text-slate-600" />}
					/>
					<TooltipContent
						className={
							"bg-white p-4 text-slate-600 text-sm shadow-xs ring-1 ring-slate-700/10 **:data-[slot='tooltip-arrow']:hidden"
						}
					>
						{tooltip}
					</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
}

function ReportingCardEmpty({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.reporting.card");

	return (
		<div
			className={cn("mb-4 px-4", className)}
			data-slot="reporting-card-empty"
			{...props}
		>
			<div className="flex flex-col items-center justify-center rounded-md border border-slate-200 border-dashed px-4 py-6 text-center">
				<span className="font-medium text-slate-800 text-sm">
					{t("emptyTitle")}
				</span>
				<span className="mt-1 block text-slate-500 text-xs">
					{t("emptyDescription")}
				</span>
			</div>
		</div>
	);
}

function ReportingCardBody({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"px-4 pt-2 pb-3 group-data-[fetching=true]/card:opacity-50",
				className,
			)}
			data-slot="reporting-card-body"
			{...props}
		/>
	);
}

function ReportingCardFooter({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"mt-auto px-4 pb-3 text-slate-500 text-xs group-data-[fetching=true]/card:opacity-50 [&_span]:block",
				className,
			)}
			data-slot="reporting-card-footer"
			{...props}
		>
			<Separator className={"mb-3"} />
			{children}
		</div>
	);
}

export {
	ReportingCard,
	ReportingCardBody,
	ReportingCardDescription,
	ReportingCardEmpty,
	ReportingCardFooter,
	ReportingCardHeader,
	ReportingCardTitle,
};
