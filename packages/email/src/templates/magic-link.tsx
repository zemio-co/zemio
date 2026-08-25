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

interface MagicLinkEmailProps {
	signInUrl: string;
	logoUrl: string;
}

export default function MagicLinkEmail({
	signInUrl,
	logoUrl,
}: MagicLinkEmailProps) {
	const t = createAppTranslator({ namespace: "emails.magicLink" });
	const tShared = createAppTranslator({ namespace: "emails.shared" });

	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>{t("preview")}</Preview>
					<Container className="bg-white px-6 py-8">
						<Img alt="zemio" className="h-5 w-fit" src={logoUrl} />
						<Text className="mt-16 font-medium text-2xl">{t("heading")}</Text>
						<Section>
							<Text>{t("greeting")}</Text>
							<Text>{t("body")}</Text>
							<Text>
								<Button href={signInUrl}>{t("cta")}</Button>
							</Text>
							<Text>{t("expiry")}</Text>
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

MagicLinkEmail.PreviewProps = {
	signInUrl: "http://localhost:3000/api/auth/magic-link/verify?token=abcdefg",
	logoUrl: "http://localhost:3000/assets/zemio-logo-woodmark.png",
};
