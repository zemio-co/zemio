import { DEFAULT_EMAIL_FROM, ROUTES } from "@/lib/consts";
import { resend } from "@/server/resend";

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
	const acceptUrl = new URL(
		ROUTES.ACCEPT_INVITATION(data.id),
		process.env.BETTER_AUTH_URL,
	).toString();

	await resend.emails.send({
		from: DEFAULT_EMAIL_FROM,
		to: data.email,
		subject: `Einladung zu ${data.organization.name}`,
		html: `
      <p>${inviterName} hat dich zu <strong>${data.organization.name}</strong> eingeladen.</p>
      <p><a href="${acceptUrl}">Einladung annehmen</a></p>
      <p>Dieser Link verfällt in 48 Stunden.</p>
    `,
	});
}
