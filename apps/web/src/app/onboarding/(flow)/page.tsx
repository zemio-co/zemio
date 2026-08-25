import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { requireOnboarding } from "@/server/modules/onboarding";

/** Where the steps are decided. Every entry into onboarding lands here first. */
const STEP_ROUTES = {
	"verify-email": ROUTES.ONBOARDING_VERIFY_EMAIL,
	name: ROUTES.ONBOARDING_NAME,
	organization: ROUTES.ONBOARDING_ORGANIZATION,
} as const;

/**
 * Sends this person to the step they still owe.
 *
 * `/onboarding` renders nothing of its own: the guard has already refused
 * anybody who is through the flow, so the only remaining question is which of
 * the three steps is outstanding.
 */
export default async function OnboardingPage() {
	const { state } = await requireOnboarding();

	// `done` cannot reach this line — `requireOnboarding` redirects it — but the
	// map is keyed by step, and narrowing here beats asserting.
	if (state.step === "done") redirect(ROUTES.USER_DASHBOARD());

	redirect(STEP_ROUTES[state.step]());
}
