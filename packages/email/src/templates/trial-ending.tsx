import { Button, Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface TrialEndingEmailProps {
	organizationName: string;
	billingUrl: string;
	logoUrl: string;
}

export default function TrialEndingEmail({
	organizationName,
	billingUrl,
	logoUrl,
}: TrialEndingEmailProps) {
	const t = createAppTranslator({ namespace: "emails.trialEnding" });

	return (
		<EmailLayout
			footer={t("footer")}
			heading={t("heading", { organization: organizationName })}
			logoUrl={logoUrl}
			preview={t("preview", { organization: organizationName })}
		>
			<Text>{t("greeting")}</Text>
			<Text>{t("body", { organization: organizationName })}</Text>
			<Text>{t("consequence")}</Text>
			<Text>
				<Button href={billingUrl}>{t("cta")}</Button>
			</Text>
		</EmailLayout>
	);
}

TrialEndingEmail.PreviewProps = {
	organizationName: "Move e.V.",
	billingUrl: "http://localhost:3000/settings/org/billing",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
