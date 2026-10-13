import { Button, Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface EmailVerificationEmailProps {
	verifyUrl: string;
	logoUrl: string;
}

export default function EmailVerificationEmail({
	verifyUrl,
	logoUrl,
}: EmailVerificationEmailProps) {
	const t = createAppTranslator({ namespace: "emails.emailVerification" });

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
				<Button href={verifyUrl}>{t("cta")}</Button>
			</Text>
			<Text>{t("expiry")}</Text>
		</EmailLayout>
	);
}

EmailVerificationEmail.PreviewProps = {
	verifyUrl: "http://localhost:3000/api/auth/verify-email?token=abcdefg",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
