import { Button, Text } from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { EmailLayout } from "../components/email-layout";

interface StatusChangedEmailProps {
	name: string;
	title: string;
	statusLabel: string;
	reportUrl: string;
	logoUrl: string;
}

export default function StatusChangedEmail({
	name,
	title,
	statusLabel,
	reportUrl,
	logoUrl,
}: StatusChangedEmailProps) {
	const t = createAppTranslator({ namespace: "emails.statusChanged" });

	return (
		<EmailLayout
			footer={t("footer")}
			heading={title}
			logoUrl={logoUrl}
			preview={t("preview", { status: statusLabel })}
		>
			<Text>{t("greeting", { name })}</Text>
			<Text>
				{t.rich("body", {
					title,
					status: statusLabel,
					strong: (chunks) => <strong className="font-medium">{chunks}</strong>,
					link: (chunks) => <Button href={reportUrl}>{chunks}</Button>,
				})}
			</Text>
		</EmailLayout>
	);
}

StatusChangedEmail.PreviewProps = {
	name: "John Doe",
	title: "Report 1",
	statusLabel: "Zur Prüfung eingereicht",
	reportUrl: "http://localhost:3000/reports/123",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
