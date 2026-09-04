import { getTranslations } from "next-intl/server";
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
 */
async function OnboardingCreateOrganizationContent({
	className,
	userEmail,
	...props
}: React.ComponentProps<"div"> & { userEmail: string }) {
	const t = await getTranslations("modules.onboarding.create");

	return (
		<OnboardingBox
			className={cn("", className)}
			data-slot="onboarding-create-organization-content"
			{...props}
		>
			<OnboardingBoxHeader>
				<OnboardingTitle>{t("title")}</OnboardingTitle>
				<OnboardingDesc>{t("subtitle")}</OnboardingDesc>
			</OnboardingBoxHeader>
			<OnboardingCreateOrganizationForm userEmail={userEmail} />
		</OnboardingBox>
	);
}

export { OnboardingCreateOrganizationContent };
