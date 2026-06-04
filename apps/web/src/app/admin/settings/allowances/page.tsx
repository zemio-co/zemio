import { Suspense } from "react";
import { PageDescription, PageTitle } from "@/components/page-title";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, HydrateClient } from "@/trpc/server";
import { MealAllowanceForm } from "./_components/meal-allowance-form";
import { TravelAllowanceForm } from "./_components/travel-allowance-form";

export default async function ServerPage() {
	void api.settings.get.prefetch();

	return (
		<HydrateClient>
			<section>
				<PageTitle>Zulagen & Abzüge</PageTitle>
				<PageDescription className="mt-2">
					Verwalte die Zulagen und Abzüge für Spesenanträge.
				</PageDescription>
			</section>
			<section className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
				<div>
					<p className="font-medium text-foreground text-sm">Verpflegung</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Die Verpfleungspauschale ist die Zulage, die ein Vereinsmitglied für die
						Verpflegung erhält.
					</p>
				</div>
				<div>
					<Suspense fallback={<Skeleton className="h-32 w-full" />}>
						<MealAllowanceForm />
					</Suspense>
				</div>
			</section>
			<Separator className={"my-6"} />
			<section className="grid grid-cols-1 gap-8 md:grid-cols-2">
				<div>
					<p className="font-medium text-foreground text-sm">Reise-Ausgaben</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Die Kilometerpauschale ist die Zulage, die ein Vereinsmitglied für
						Reise-Ausgaben erhält.
					</p>
				</div>
				<div>
					<Suspense fallback={<Skeleton className="h-32 w-full" />}>
						<TravelAllowanceForm />
					</Suspense>
				</div>
			</section>
		</HydrateClient>
	);
}
