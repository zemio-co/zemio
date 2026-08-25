import { OnboardingNoOrgContent } from "@/modules/onboarding";
import { db } from "@/server/db";
import { resolveOpenings } from "@/server/modules/joining";
import { requireOnboardedAndOrgless } from "@/server/modules/onboarding";

/**
 * Belonging to nothing is a state someone can act on, not a dead end: an
 * invitation to accept, or an organization to create.
 */
export default async function OnboardingNoOrgPage() {
	const session = await requireOnboardedAndOrgless();

	// Nothing is listed for an address Zemio has not verified. Naming the
	// organizations that invited someone is itself something the address
	// grants, and an unproven address grants nothing (ADR-0008). It costs the
	// invited person nothing: their invitation arrived by email, and its link
	// leads through the same verification gate.
	const openings = session.user.emailVerified
		? await resolveOpenings(db, session.user.email)
		: { invitations: [] };

	return (
		<OnboardingNoOrgContent
			emailVerified={session.user.emailVerified}
			invitations={openings.invitations.map((invitation) => ({
				id: invitation.id,
				organizationName: invitation.organization.name,
			}))}
			isPlatformAdmin={session.user.role === "admin"}
			userEmail={session.user.email}
		/>
	);
}
