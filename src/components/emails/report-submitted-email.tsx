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
	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>Dein Spesenbericht wurde eingereicht</Preview>
					<Container className="bg-white px-6 py-8">
						<Img
							className="h-5 w-fit"
							src={`${baseUrl}/assets/zemio-logo-woodmark.png`}
						/>
						<Text className="mt-16 font-medium text-2xl">{title}</Text>
						<Section>
							<Text>Hallo {name},</Text>
							<Text>
								Hiermit bestätigen wir, dass dein Spesenbericht "{title}" erfolgreich
								eingereicht wurde. Bitte warte nun auf die Freigabe durch einen
								Reviewer.
							</Text>
							<Text>
								Wende dich bei Fragen bitte an{" "}
								<Button href="mailto:support@zemio.co">support@zemio.co</Button>.
							</Text>
							<Text>
								Beste Grüße,
								<br />
								Dein zemio Team
							</Text>
							<Hr />
							<Text className="text-xs text-zinc-500">
								Du erhältst diese E-Mail, da du einen Spesenbericht eingereicht hast.
								Solltest du keinen Spesenbericht eingereicht haben, kannst du diese
								E-Mail ignorieren.
							</Text>
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
