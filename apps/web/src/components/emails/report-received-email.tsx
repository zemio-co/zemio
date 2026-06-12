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
	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>
						"{title}" von {from}
					</Preview>
					<Container className="bg-white px-6 py-8">
						<Img
							className="h-5 w-fit"
							src={`${baseUrl}/assets/zemio-logo-woodmark.png`}
						/>
						<Text className="mt-16 font-medium text-2xl">{title}</Text>
						<Section>
							<Text>Hallo,</Text>
							<Text>
								Der Nutzer <strong>{from}</strong> hat einen neuen Spesenbericht über
								zemio eingereicht. Den Antrag kannst du{" "}
								<Link href={`${baseUrl}${ROUTES.ADMIN_REVIEW_REPORT(reportId)}`}>
									hier
								</Link>{" "}
								bearbeiten.
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
								Du erhältst diese E-Mail, da du in zemio als Reviewer eingetragen bist.
								Solltest du kein Reviewer sein, kannst du diese E-Mail ignorieren.
							</Text>
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
