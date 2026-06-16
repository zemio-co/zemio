import { Suspense } from "react";
import { PageDescription, PageTitle } from "@/components/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AdminReportsContent } from "@/modules/admin";
import { api, HydrateClient } from "@/trpc/server";
import { ReportsList } from "./data-display/reports-list";

export default async function ServerPage() {
	// Prefetch filter options and first page of reports in parallel
	void api.reportFilters.options.prefetch();
	void api.report.reviewList.prefetchInfinite({ limit: 50 });

	return (
		<>
			<AdminReportsContent />
			<HydrateClient>
				<section
					className={cn(
						"container mt-12 flex flex-col flex-wrap items-start justify-start gap-4 sm:flex-row",
					)}
				>
					<div>
						<PageTitle>Admin Dashboard</PageTitle>
						<PageDescription className="mt-2">
							Verwalte deine Spesenanträge
						</PageDescription>
					</div>
				</section>
				<section className="mt-8">
					<Suspense
						fallback={
							<div className="container space-y-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						}
					>
						<ReportsList />
					</Suspense>
				</section>
			</HydrateClient>
		</>
	);
}
