import { createAppTranslator } from "@zemio/i18n";
import { Suspense } from "react";
import { PreferencesForm } from "@/components/forms/preferences-form";
import { PageDescription, PageTitle } from "@/components/page-title";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, HydrateClient } from "@/trpc/server";
import { BankingDetailsList } from "./_components/banking-details-list";

const t = createAppTranslator({ namespace: "modules.preferences.page" });

export default async function ServerPage() {
	void api.preferences.getOwn.prefetch();
	void api.bankingDetails.list.prefetch();

	return (
		<HydrateClient>
			<section className="container mt-12">
				<PageTitle>{t("title")}</PageTitle>
				<PageDescription className="mt-2">{t("description")}</PageDescription>
			</section>
			<section className="container mt-12 pb-20">
				<PreferencesForm />
				<Separator className="my-6" />
				<div className="grid gap-8 md:grid-cols-2">
					<div>
						<p className="font-medium text-foreground text-sm">
							{t("bankingDetailsTitle")}
						</p>
						<p className="mt-1 text-muted-foreground text-xs">
							{t("bankingDetailsDescription")}
						</p>
					</div>
					<div>
						<Suspense fallback={<Skeleton className="h-10 w-full" />}>
							<BankingDetailsList />
						</Suspense>
					</div>
				</div>
			</section>
		</HydrateClient>
	);
}
