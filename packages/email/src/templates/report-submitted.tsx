import { Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface ReportSubmittedEmailProps {
	title: string;
	name: string;
	logoUrl: string;
}

export default function ReportSubmittedEmail({
	title,
	name,
	logoUrl,
}: ReportSubmittedEmailProps) {
	const t = createAppTranslator({ namespace: "emails.reportSubmitted" });

	return (
		<EmailLayout
			footer={t("footer")}
			heading={title}
			logoUrl={logoUrl}
			preview={t("preview")}
		>
			<Text>{t("greeting", { name })}</Text>
			<Text>{t("body", { title })}</Text>
		</EmailLayout>
	);
}

ReportSubmittedEmail.PreviewProps = {
	name: "John Doe",
	title: "Report 1",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
