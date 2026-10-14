import { Button, Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface OrgInvitationEmailProps {
	organizationName: string;
	inviterName: string;
	acceptUrl: string;
	logoUrl: string;
}

export default function OrgInvitationEmail({
	organizationName,
	inviterName,
	acceptUrl,
	logoUrl,
}: OrgInvitationEmailProps) {
	const t = createAppTranslator({ namespace: "emails.orgInvitation" });

	return (
		<EmailLayout
			footer={t("footer")}
			heading={t("heading", { organization: organizationName })}
			logoUrl={logoUrl}
			preview={t("preview", {
				inviter: inviterName,
				organization: organizationName,
			})}
		>
			<Text>{t("greeting")}</Text>
			<Text>
				{t.rich("body", {
					inviter: inviterName,
					organization: organizationName,
					strong: (chunks) => <strong className="font-medium">{chunks}</strong>,
				})}
			</Text>
			<Text>
				<Button href={acceptUrl}>{t("cta")}</Button>
			</Text>
			<Text>{t("expiry")}</Text>
		</EmailLayout>
	);
}

OrgInvitationEmail.PreviewProps = {
	organizationName: "Move e.V.",
	inviterName: "Markus Müller",
	acceptUrl: "http://localhost:3000/accept-invitation/abcdefg",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
