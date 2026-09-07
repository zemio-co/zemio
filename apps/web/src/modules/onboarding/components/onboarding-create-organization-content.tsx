import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OnboardingCreateOrganizationForm } from "./onboarding-create-organization-form";
import { OnboardingBox, OnboardingBoxHeader } from "./primtives/onboarding-box";
import { OnboardingDesc, OnboardingTitle } from "./primtives/onboarding-text";

/**
 * Step five: the organization this person is about to own.
 *
 * The way back is a link to the previous step rather than history: somebody
 * who arrived here from an invitation mail has no previous step to go back to,
 * and a browser-history button would strand them on the sign-in page.
 *
 * Shown only when the previous step had something to offer. Reached with no
 * invitations, it *is* the previous step — sent here by its redirect — and a
 * link back would land where it started.
 */
async function OnboardingCreateOrganizationContent({
	className,
	userEmail,
	canGoBack = false,
	...props
}: React.ComponentProps<"div"> & { userEmail: string; canGoBack?: boolean }) {
	const t = await getTranslations("modules.onboarding.create");

	return (
		<OnboardingBox
			className={cn(className)}
			data-slot="onboarding-create-organization-content"
			{...props}
		>
			<OnboardingBoxHeader>
				<OnboardingTitle>{t("title")}</OnboardingTitle>
				<OnboardingDesc>{t("subtitle")}</OnboardingDesc>
			</OnboardingBoxHeader>
			<OnboardingCreateOrganizationForm userEmail={userEmail} />
			{canGoBack && (
				<Link
					className="flex w-fit items-center gap-1.5 font-medium text-accent-600 text-sm"
					href={ROUTES.ONBOARDING_ORGANIZATION()}
				>
					<ArrowLeftIcon className="size-3.5 shrink-0" />
					{t("back")}
				</Link>
			)}
		</OnboardingBox>
	);
}

export { OnboardingCreateOrganizationContent };
