import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import type { ReportStatus } from "@zemio/db";
import { createAppTranslator } from "@zemio/i18n";
import { reportStatusLabel } from "@/lib/i18n-labels";
import { ROUTES } from "@/lib/routes";

interface StatusChangedEmailProps {
	name: string;
	title: string;
	status: ReportStatus;
	reportId: string;
}

const baseUrl =
	process.env.NODE_ENV === "production"
		? "https://spesen.move-ev.de"
		: "http://localhost:3000";

export default function StatusChangedEmail({
	name,
	title,
	status,
	reportId,
}: StatusChangedEmailProps) {
	const t = createAppTranslator({ namespace: "emails.statusChanged" });
	const tShared = createAppTranslator({ namespace: "emails.shared" });
	const statusLabel = reportStatusLabel(status);

	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>{t("preview", { status: statusLabel })}</Preview>
					<Container className="bg-white px-6 py-8">
						<Img
							className="h-5 w-fit"
							src={`${baseUrl}/assets/zemio-logo-woodmark.png`}
						/>
						<Text className="mt-16 font-medium text-2xl">{title}</Text>
						<Section>
							<Text>{t("greeting", { name })}</Text>
							<Text>
								{t.rich("body", {
									title,
									status: statusLabel,
									strong: (chunks) => <strong className="font-medium">{chunks}</strong>,
									link: (chunks) => (
										<Button href={`${baseUrl}${ROUTES.USER_REPORT_DETAILS(reportId)}`}>
											{chunks}
										</Button>
									),
								})}
							</Text>

							<Text>
								{tShared.rich("supportPrompt", {
									email: (chunks) => (
										<Button href="mailto:support@zemio.co">{chunks}</Button>
									),
								})}
							</Text>
							<Text>
								{tShared("regards")}
								<br />
								{tShared("team")}
							</Text>
							<Hr />
							<Text className="text-xs text-zinc-500">{t("footer")}</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

StatusChangedEmail.PreviewProps = {
	name: "John Doe",
	title: "Report 1",
	status: "PENDING_APPROVAL",
	reportId: "123",
};
