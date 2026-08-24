import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { resolveOpenings } from "@/server/modules/joining";
import { NoOrgPageContent } from "./_components/no-org-page";

export default async function NoOrgPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	// If the user has since been added to an org (e.g. admin created one),
	// send them straight to the app.
	const memberCount = await db.member.count({
		where: { userId: session.user.id },
	});

	if (memberCount > 0) {
		redirect(ROUTES.USER_DASHBOARD);
	}

	// Belonging to nothing is a state someone can act on, not a dead end: an
	// invitation to accept, or an organization to create.
	//
	// Nothing is listed for an address Zemio has not verified. Naming the
	// organizations that invited someone is itself something the address
	// grants, and an unproven address grants nothing (ADR-0008). It costs the
	// invited person nothing: their invitation arrived by email, and its link
	// leads through the same verification gate.
	const openings = session.user.emailVerified
		? await resolveOpenings(db, session.user.email)
		: { invitations: [] };

	return (
		<NoOrgPageContent
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
