import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { findInvitationById, gateInvitation } from "@/server/modules/joining";
import { AcceptInvitationPageContent } from "./_components/accept-invitation-page";
import { InvitationBlocked } from "./_components/invitation-blocked";

export default async function AcceptInvitationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(ROUTES.AUTH);
	}

	const { id } = await params;
	const invitation = await findInvitationById(db, id);

	// Read from Zemio's own tables and decided here, rather than left to the
	// accept call: Better Auth answers a mismatch with "you are not the
	// recipient", which never names the address that would work.
	const gate = gateInvitation(
		invitation,
		{
			email: session.user.email,
			emailVerified: session.user.emailVerified,
		},
		new Date(),
	);

	if (gate !== "ready") {
		return (
			<InvitationBlocked
				currentEmail={session.user.email}
				invitedEmail={invitation?.email ?? null}
				reason={gate}
			/>
		);
	}

	return (
		<AcceptInvitationPageContent
			invitationId={id}
			organizationName={invitation?.organization.name ?? null}
		/>
	);
}
