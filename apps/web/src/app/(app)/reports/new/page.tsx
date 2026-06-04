import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CreateReportForm } from "@/components/forms/create-report-form";
import { PageDescription, PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/consts";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	void api.costUnit.listGroupsWithUnits.prefetch();
	void api.bankingDetails.list.prefetch();

	return (
		<HydrateClient>
			<section className="container mt-12 max-w-4xl">
				<Button
					className={"-ms-2"}
					nativeButton={false}
					render={
						<Link href={ROUTES.USER_DASHBOARD}>
							<ArrowLeftIcon />
							Zurück zur Übersicht
						</Link>
					}
					variant={"ghost"}
				/>
				<PageTitle className="mt-8">Neuer Spesenantrag</PageTitle>
				<PageDescription className="mt-2">
					Erstelle einen neuen Spesenantrag
				</PageDescription>
			</section>
			<section className="container mt-10 max-w-4xl pb-12">
				<Suspense fallback={<Skeleton className="h-32 w-full" />}>
					<CreateReportForm />
				</Suspense>
			</section>
		</HydrateClient>
	);
}
