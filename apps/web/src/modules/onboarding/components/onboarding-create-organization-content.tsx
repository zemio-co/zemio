import { ArrowLeftIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OnboardingCreateOrganizationForm } from "./onboarding-create-organization-form";

/**
 * Step five: the organization this person is about to own.
 *
 * The way back is a link to the previous step rather than history: somebody
 * who arrived here from an invitation mail has no previous step to go back to,
 * and a browser-history button would strand them on the sign-in page.
 */
async function OnboardingCreateOrganizationContent({
	className,
	userEmail,
	...props
}: React.ComponentProps<"div"> & { userEmail: string }) {
	const t = await getTranslations("modules.onboarding.create");

	return (
		<div
			className={cn(className)}
			data-slot="onboarding-create-organization-content"
			{...props}
		>
			<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
				<BuildingIcon className="size-5 text-zinc-600" />
			</div>
			<h1 className="font-semibold text-lg text-zinc-800">{t("title")}</h1>
			<p className="mt-1.5 max-w-prose text-sm text-zinc-500">{t("subtitle")}</p>

			<OnboardingCreateOrganizationForm className="mt-8" userEmail={userEmail} />

			<Link
				className="mt-6 flex items-center justify-center gap-1.5 font-medium text-sm text-zinc-500 hover:text-zinc-800"
				href={ROUTES.ONBOARDING_ORGANIZATION()}
			>
				<ArrowLeftIcon className="size-3.5" />
				{t("back")}
			</Link>
		</div>
	);
}

export { OnboardingCreateOrganizationContent };
