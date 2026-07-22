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
import { createAppTranslator } from "@zemio/i18n";

const baseUrl =
	process.env.NODE_ENV === "production"
		? "https://app.zemio.co"
		: "http://localhost:3000";

interface ReportSubmittedEmailProps {
	title: string;
	name: string;
}

export default function ReportSubmittedEmail({
	title,
	name,
}: ReportSubmittedEmailProps) {
	const t = createAppTranslator({ namespace: "emails.reportSubmitted" });
	const tShared = createAppTranslator({ namespace: "emails.shared" });

	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>{t("preview")}</Preview>
					<Container className="bg-white px-6 py-8">
						<Img
							className="h-5 w-fit"
							src={`${baseUrl}/assets/zemio-logo-woodmark.png`}
						/>
						<Text className="mt-16 font-medium text-2xl">{title}</Text>
						<Section>
							<Text>{t("greeting", { name })}</Text>
							<Text>{t("body", { title })}</Text>
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

ReportSubmittedEmail.PreviewProps = {
	name: "John Doe",
	title: "Report 1",
};
