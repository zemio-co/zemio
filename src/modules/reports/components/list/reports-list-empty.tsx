"use client";

import { FilterIcon, PlusIcon, TrafficConeIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

function ReportsListEmpty({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="reports-list-empty" {...props}>
			<div className="mx-auto max-w-md">
				<div className="mb-8 flex w-fit items-center justify-center rounded-sm bg-zinc-100 p-2">
					<TrafficConeIcon className="size-5" />
				</div>
				<p className="font-medium text-sm">No reports created yet</p>
				<p className="mt-1 text-muted-foreground text-sm">
					You haven't created any reports yet. Create a new report to get started.
				</p>
				<div className="mt-4">
					<Link
						className={buttonVariants({ size: "sm" })}
						href={ROUTES.USER_REPORT_NEW()}
					>
						Create new report
						<PlusIcon />
					</Link>
				</div>
			</div>
		</div>
	);
}

function ReportsListNoResults({
	className,
	onClearFilters,
	...props
}: React.ComponentProps<"div"> & {
	onClearFilters: () => void;
}) {
	return (
		<div
			className={cn("", className)}
			data-slot="reports-list-no-results"
			{...props}
		>
			<div className="mx-auto max-w-md">
				<div className="mb-8 flex w-fit items-center justify-center rounded-sm bg-zinc-100 p-2">
					<FilterIcon className="size-5" />
				</div>
				<p className="font-medium text-sm">No reports found</p>
				<p className="mt-1 text-muted-foreground text-sm">
					There were no reports found with the current filters. Try again with
					different filters.
				</p>
				<div className="mt-4">
					<Button onClick={onClearFilters} size={"sm"}>
						Clear filters
						<XIcon />
					</Button>
				</div>
			</div>
		</div>
	);
}

export { ReportsListEmpty, ReportsListNoResults };
