import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";
import { auth } from "@/server/better-auth";
import {
	buildLegalOnboardingRedirectPath,
	hasAcceptedCurrentLegalRelease,
} from "@/server/legal";
import { AcceptInvitationPageContent } from "./_components/accept-invitation-page";

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

	if (!hasAcceptedCurrentLegalRelease(session)) {
		redirect(buildLegalOnboardingRedirectPath(ROUTES.ACCEPT_INVITATION(id)));
	}

	return <AcceptInvitationPageContent invitationId={id} />;
}
