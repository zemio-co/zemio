import { Link, Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface ReportReceivedEmailProps {
	title: string;
	submittedBy: string;
	reportUrl: string;
	logoUrl: string;
}

export default function ReportReceivedEmail({
	title,
	submittedBy,
	reportUrl,
	logoUrl,
}: ReportReceivedEmailProps) {
	const t = createAppTranslator({ namespace: "emails.reportReceived" });

	return (
		<EmailLayout
			footer={t("footer")}
			heading={title}
			logoUrl={logoUrl}
			preview={t("preview", { title, from: submittedBy })}
		>
			<Text>{t("greeting")}</Text>
			<Text>
				{t.rich("body", {
					from: submittedBy,
					strong: (chunks) => <strong>{chunks}</strong>,
					link: (chunks) => <Link href={reportUrl}>{chunks}</Link>,
				})}
			</Text>
		</EmailLayout>
	);
}

ReportReceivedEmail.PreviewProps = {
	submittedBy: "Markus Müller",
	title: "Report 1",
	reportUrl: "http://localhost:3000/admin/reports/abcdefg",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
