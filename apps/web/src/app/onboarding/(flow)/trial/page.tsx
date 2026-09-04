import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingTrialContent } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

/**
 * The last step, reached from the invite step rather than resolved into.
 *
 * `nextOnboardingStep` holds a founder on `invite` for as long as the flow is
 * unfinished — there is no fact that separates "has not invited anybody" from
 * "chose not to" — so this page is entered by walking to it, and its guards
 * are what make that safe to allow.
 */
export default async function OnboardingTrialPage() {
	const { state } = await requireOnboarding();

	if (!state.facts.hasMembership) redirect(ROUTES.ONBOARDING());
	if (!state.facts.isOwner) redirect(ROUTES.ONBOARDING());

	return <OnboardingTrialContent />;
}
