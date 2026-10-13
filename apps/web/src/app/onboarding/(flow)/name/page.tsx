import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingNameContent } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

export default async function OnboardingNamePage() {
	const { state } = await requireOnboarding();

	// The steps are ordered, and this one comes after the address.
	if (!state.facts.emailVerified) redirect(ROUTES.ONBOARDING());

	// Prefilled from whatever the identity provider supplied — a Microsoft
	// sign-in carries a name, a magic link carries nothing — so the common case
	// is confirming rather than typing.
	return <OnboardingNameContent defaultName={state.facts.name} />;
}
