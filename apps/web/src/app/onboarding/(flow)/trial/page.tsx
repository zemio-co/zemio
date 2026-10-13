import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingTrialContent } from "@/modules/onboarding";
import { requireOnboarding } from "@/server/modules/onboarding";

/**
 * The last step, reached from the invite step rather than resolved into.
 *
 * `nextOnboardingStep` holds a founder on `invite` for as long as the flow is
 * unfinished — there is no fact that separates "has not invited anybody" from
 * "chose not to" — so this page is entered by walking to it, and admits
 * exactly the people who could have: those whose step is `invite`. That is
 * also the only step finishing onboarding accepts, so nobody can reach a
 * Continue here that would then refuse them.
 */
export default async function OnboardingTrialPage() {
	const { state } = await requireOnboarding();

	if (state.step !== "invite") redirect(ROUTES.ONBOARDING());

	return <OnboardingTrialContent />;
}
