import { redirect } from "next/navigation";
import { trialPageVariant } from "@/lib/billing";
import { ROUTES } from "@/lib/routes";
import { OnboardingTrialContent } from "@/modules/onboarding";
import { db } from "@/server/db";
import { billingConfig } from "@/server/modules/billing/billing.config";
import { getBillingStatus } from "@/server/modules/billing/billing.service";
import {
	findFoundedOrganization,
	requireOnboarding,
} from "@/server/modules/onboarding";

/**
 * The last step, reached from the invite step rather than resolved into.
 *
 * `nextOnboardingStep` holds a founder on `invite` for as long as the flow is
 * unfinished — there is no fact that separates "has not invited anybody" from
 * "chose not to" — so this page is entered by walking to it, and admits
 * exactly the people who could have: those whose step is `invite`. That is
 * also the only step finishing onboarding accepts, so nobody can reach a
 * Continue here that would then refuse them.
 *
 * What it says depends on what the founder actually got. A trial is not a
 * given — billing may be switched off, the trial may not have started, or the
 * person may have had theirs (ADR-0009) — and the page is read from the
 * founded organization's billing rather than written as a promise.
 */
export default async function OnboardingTrialPage() {
	const { session, state } = await requireOnboarding();

	if (state.step !== "invite") redirect(ROUTES.ONBOARDING());

	const organization = await findFoundedOrganization(db, session.user.id);
	if (!organization) redirect(ROUTES.ONBOARDING());

	const status = await getBillingStatus(
		{ db, config: billingConfig },
		organization.id,
	);

	return <OnboardingTrialContent variant={trialPageVariant(status)} />;
}
