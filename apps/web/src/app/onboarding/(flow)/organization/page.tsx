import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { OnboardingOrganizationContent } from "@/modules/onboarding";
import { db } from "@/server/db";
import { resolveOpenings } from "@/server/modules/joining";
import { requireOnboarding } from "@/server/modules/onboarding";

export default async function OnboardingOrganizationPage() {
	const { session, state } = await requireOnboarding();

	if (!state.facts.emailVerified) redirect(ROUTES.ONBOARDING());
	if (state.facts.name.trim() === "") redirect(ROUTES.ONBOARDING_NAME());

	// Nothing is listed for an address Zemio has not verified — but the guard
	// above has already established that it has, so this is the ordinary path
	// rather than a special case. Naming the organizations that invited someone
	// is itself something the address grants (ADR-0008).
	const openings = await resolveOpenings(db, session.user.email);

	// With nothing to choose between, this page is a heading over a single
	// button. The one move left is made for them.
	if (openings.invitations.length === 0) {
		redirect(ROUTES.ONBOARDING_ORGANIZATION_NEW());
	}

	return (
		<OnboardingOrganizationContent
			invitations={openings.invitations.map((invitation) => ({
				id: invitation.id,
				organizationName: invitation.organization.name,
			}))}
		/>
	);
}
