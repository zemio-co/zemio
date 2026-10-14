import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingConfirmEmail } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

export default async function OnboardingVerifyEmailPage() {
	const { session, state } = await requireOnboarding();

	// Somebody whose address is already confirmed has nothing to do here. Sent
	// back to the resolver rather than forward to a named step, so there is one
	// place that decides what comes next.
	if (state.facts.emailVerified) redirect(ROUTES.ONBOARDING());

	return <OnboardingConfirmEmail email={session.user.email} />;
}
