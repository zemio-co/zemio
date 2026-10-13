import { Button, Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface MagicLinkEmailProps {
	signInUrl: string;
	logoUrl: string;
}

export default function MagicLinkEmail({
	signInUrl,
	logoUrl,
}: MagicLinkEmailProps) {
	const t = createAppTranslator({ namespace: "emails.magicLink" });

	return (
		<EmailLayout
			footer={t("footer")}
			heading={t("heading")}
			logoUrl={logoUrl}
			preview={t("preview")}
		>
			<Text>{t("greeting")}</Text>
			<Text>{t("body")}</Text>
			<Text>
				<Button href={signInUrl}>{t("cta")}</Button>
			</Text>
			<Text>{t("expiry")}</Text>
		</EmailLayout>
	);
}

MagicLinkEmail.PreviewProps = {
	signInUrl: "http://localhost:3000/api/auth/magic-link/verify?token=abcdefg",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
