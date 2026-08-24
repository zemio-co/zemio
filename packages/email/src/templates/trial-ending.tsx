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
	const tShared = createAppTranslator({ namespace: "emails.shared" });

	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>{t("preview", { organization: organizationName })}</Preview>
					<Container className="bg-white px-6 py-8">
						<Img alt="zemio" className="h-5 w-fit" src={logoUrl} />
						<Text className="mt-16 font-medium text-2xl">
							{t("heading", { organization: organizationName })}
						</Text>
						<Section>
							<Text>{t("greeting")}</Text>
							<Text>{t("body", { organization: organizationName })}</Text>
							<Text>{t("consequence")}</Text>
							<Text>
								<Button href={billingUrl}>{t("cta")}</Button>
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

TrialEndingEmail.PreviewProps = {
	organizationName: "Move e.V.",
	billingUrl: "http://localhost:3000/settings/org/billing",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
