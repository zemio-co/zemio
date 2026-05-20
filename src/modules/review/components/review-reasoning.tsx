"use client";

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
						Fehler beim Laden des Reports
					</p>
					<p className="text-center text-xs">
						{errorMessage ?? "Ein unbekannter Fehler ist aufgetreten"}
					</p>
				</div>
			</section>
		);
	}

	if (!report.description) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">Keine Begründung</p>
					<p className="text-center text-xs">
						Der Nutzer hat keine Begründung für diesen Antrag angegeben.
					</p>
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
	return (
		<div
			className={cn("flex items-center justify-start gap-2", className)}
			data-slot="component"
			{...props}
		>
			<p className="font-semibold text-zinc-800">Begründung</p>
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
				<p className="text-sm text-zinc-500">Von</p>
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
