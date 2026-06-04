import { Suspense } from "react";
import { AdminSettingsForm } from "@/components/forms/admin-settings-form";
import { PageTitle } from "@/components/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	void api.settings.get.prefetch();

	return (
		<HydrateClient>
			<section>
				<PageTitle>Allgemeine Einstellungen</PageTitle>
			</section>
			<section className="mt-10">
				<Suspense fallback={<Skeleton className="h-32 w-full" />}>
					<AdminSettingsForm />
				</Suspense>
			</section>
		</HydrateClient>
	);
}
