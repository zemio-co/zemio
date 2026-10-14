import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingCreateOrganizationContent } from "@/modules/onboarding";
import { db } from "@/server/db";
import { resolveOpenings } from "@/server/modules/joining";
import { requireOnboarding } from "@/server/modules/onboarding";

export default async function OnboardingCreateOrganizationPage() {
	const { session, state } = await requireOnboarding();

	if (!state.facts.emailVerified) redirect(ROUTES.ONBOARDING());
	if (state.facts.name.trim() === "") redirect(ROUTES.ONBOARDING_NAME());

	// Same guard as the step this is reached from: a founder held on the tail
	// can still walk back to this URL, and a second organization created there
	// gets no trial and is read-only from the moment it exists (ADR-0009).
	if (state.facts.hasMembership) redirect(ROUTES.ONBOARDING());

	// Whether there is anything to go back to. The organization step sends
	// somebody straight here when nothing has invited them, so a back link
	// offered unconditionally would bounce them off that redirect and land them
	// where they started.
	const openings = await resolveOpenings(db, session.user.email);

	return (
		<OnboardingCreateOrganizationContent
			canGoBack={openings.invitations.length > 0}
			userEmail={session.user.email}
		/>
	);
}
