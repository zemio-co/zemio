import { BoxesIcon, PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { PageTitle } from "@/components/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { api, HydrateClient } from "@/trpc/server";
import { CostUnitsList } from "./components/cost-units-list";
import { CreateCostUnit } from "./components/create-cost-unit";
import { CreateCostUnitGroup } from "./components/create-cost-unit-group";

export default async function ServerPage() {
	void api.costUnit.listGrouped.prefetch();
	void api.costUnit.listGroups.prefetch();

	return (
		<HydrateClient>
			<section className="flex flex-col flex-wrap items-center justify-start gap-4 sm:flex-row">
				<PageTitle className="me-auto">Kostenstellen</PageTitle>
				<div className="flex w-full gap-4 sm:w-fit">
					<CreateCostUnitGroup className="w-full sm:w-fit" variant={"outline"}>
						<BoxesIcon /> Neue Gruppe
					</CreateCostUnitGroup>
					<Suspense fallback={<Skeleton className="h-8 w-full sm:w-41" />}>
						<CreateCostUnit className="w-full sm:w-fit">
							<PlusIcon /> Neue Kostenstelle
						</CreateCostUnit>
					</Suspense>
				</div>
			</section>
			<section className="mt-8">
				<Suspense fallback={<CostUnitsListSkeleton />}>
					<CostUnitsList />
				</Suspense>
			</section>
		</HydrateClient>
	);
}

function CostUnitsListSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			<div>
				<Skeleton className="mb-4 h-6 w-32" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-32 w-full rounded-xl" />
					<Skeleton className="h-32 w-full rounded-xl" />
					<Skeleton className="h-32 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
