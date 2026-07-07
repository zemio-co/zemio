"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { ReportingByCostUnitCard } from "./reporting-by-cost-unit";
import { ReportingByMembersCard } from "./reporting-by-member";
import { ReportingHeader } from "./reporting-header";
import { ReportingOverviewCard } from "./reporting-overview";
import { ReportingReportsTimeline } from "./reporting-reports-timeline";

function ReportingContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="reporting-content" {...props}>
			<main className="py-12">
				<ReportingHeader />
				<section className="container mt-12">
					<div className="grid gap-2 rounded-xl bg-slate-100 p-2 lg:grid-cols-2 xl:grid-cols-3">
						<ReportingOverviewCard className="lg:col-span-2" />
						<ReportingByMembersCard />

						<ReportingReportsTimeline className="max-sm:row-start-4 lg:col-span-2 lg:max-xl:row-start-2" />
						<ReportingByCostUnitCard />
					</div>
				</section>
			</main>
		</div>
	);
}

export { ReportingContent };
