import { ROUTES } from "@/lib/consts";
import { logger } from "@/lib/logger";
import { absoluteUrl, getEmailer, logSend } from "@/server/email";

type OrganizationInvitationEmailData = {
	email: string;
	id: string;
	inviter: {
		user: {
			name?: string | null;
		};
	};
	organization: {
		name: string;
	};
};

export async function sendOrgInvitationEmail(
	data: OrganizationInvitationEmailData,
) {
	const inviterName = data.inviter.user.name ?? "Ein Teammitglied";
	const acceptUrl = absoluteUrl(ROUTES.ACCEPT_INVITATION(data.id));

	// Best-effort: the invitation row exists either way and the link can be
	// resent, so a failed send is logged rather than failing the mutation.
	// Better Auth awaits this hook, so a throw — a misconfigured sender, a
	// template fault — would take the whole invitation call down with it; the
	// catch is what makes the promise above true.
	try {
		const result = await getEmailer().sendOrgInvitation({
			to: data.email,
			organizationName: data.organization.name,
			inviterName,
			acceptUrl,
		});
		logSend("email.org_invitation", result, { invitationId: data.id });
	} catch (error) {
		logger.error("email.org_invitation_failed", {
			invitationId: data.id,
			error,
		});
	}
}
