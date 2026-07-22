import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { createAppTranslator } from "@zemio/i18n";
import { ROUTES } from "@/lib/routes";

const baseUrl =
	process.env.NODE_ENV === "production"
		? "https://app.zemio.co"
		: "http://localhost:3000";

interface ReportReceivedEmailProps {
	title: string;
	from: string;
	reportId: string;
}

export default function ReportReceivedEmail({
	title,
	from,
	reportId,
}: ReportReceivedEmailProps) {
	const t = createAppTranslator({ namespace: "emails.reportReceived" });
	const tShared = createAppTranslator({ namespace: "emails.shared" });

	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>{t("preview", { title, from })}</Preview>
					<Container className="bg-white px-6 py-8">
						<Img
							className="h-5 w-fit"
							src={`${baseUrl}/assets/zemio-logo-woodmark.png`}
						/>
						<Text className="mt-16 font-medium text-2xl">{title}</Text>
						<Section>
							<Text>{t("greeting")}</Text>
							<Text>
								{t.rich("body", {
									from,
									strong: (chunks) => <strong>{chunks}</strong>,
									link: (chunks) => (
										<Link href={`${baseUrl}${ROUTES.ADMIN_REVIEW_REPORT(reportId)}`}>
											{chunks}
										</Link>
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

ReportReceivedEmail.PreviewProps = {
	from: "Markus Müller",
	title: "Report 1",
	reportId: "abcdegf",
};
