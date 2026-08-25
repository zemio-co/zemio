import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingCreateOrganizationContent } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

export default async function OnboardingCreateOrganizationPage() {
	const { session, state } = await requireOnboarding();

	if (!state.facts.emailVerified) redirect(ROUTES.ONBOARDING());
	if (state.facts.name.trim() === "") redirect(ROUTES.ONBOARDING_NAME());

	return <OnboardingCreateOrganizationContent userEmail={session.user.email} />;
}
