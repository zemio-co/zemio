"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReviewLoadState, ReviewReport } from "./review-types";

function ReviewReasoning({
	className,
	errorMessage,
	loading,
	report,
	...props
}: React.ComponentProps<"section"> & {
	report?: ReviewReport;
} & ReviewLoadState) {
	const t = useTranslations("modules.review.reasoning");

	if (loading) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<Skeleton className="min-h-32 w-full" />
			</section>
		);
	}

	if (errorMessage || !report) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-destructive text-sm">
						{t("loadErrorTitle")}
					</p>
					<p className="text-center text-xs">{errorMessage ?? t("unknownError")}</p>
				</div>
			</section>
		);
	}

	if (!report.description) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">{t("emptyTitle")}</p>
					<p className="text-center text-xs">{t("emptyDescription")}</p>
				</div>
			</section>
		);
	}

	return (
		<section className={cn("space-y-4", className)} {...props}>
			<ReasoningHeader />
			<ReasoningContent report={report} />
		</section>
	);
}

function ReasoningHeader({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.review.reasoning");

	return (
		<div
			className={cn("flex items-center justify-start gap-2", className)}
			data-slot="component"
			{...props}
		>
			<p className="font-semibold text-zinc-800">{t("title")}</p>
		</div>
	);
}

function ReasoningContent({
	className,
	report,
	...props
}: React.ComponentProps<"div"> & {
	report: ReviewReport;
}) {
	const t = useTranslations("modules.review.reasoning");

	return (
		<div
			className={cn("space-y-3", className)}
			data-slot="reasoning-content"
			{...props}
		>
			<p className="max-w-prose rounded-lg rounded-bl-none bg-background px-4 py-3 text-zinc-700 leading-7 shadow-sm ring-1 ring-zinc-700/15">
				{report.description}
			</p>
			<div className="flex items-center justify-start">
				<p className="text-sm text-zinc-500">{t("byLabel")}</p>
				<Avatar className={"mr-1 ml-2 size-3.5"}>
					<AvatarImage src={report.owner.image ?? undefined} />
					<AvatarFallback>
						{report.owner.name.charAt(0)?.toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<p className="font-medium text-sm text-zinc-600">{report.owner.name}</p>
			</div>
		</div>
	);
}

export { ReviewReasoning };
