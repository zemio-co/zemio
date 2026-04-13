import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

interface ReportReceivedEmailProps {
	title: string;
	from: string;
}
export default function ReportReceivedEmail({
	title,
	from,
}: ReportReceivedEmailProps) {
	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="font-sans">
					<Preview>Neuer Spesenbericht erhalten</Preview>
					<Container>
						<Text className="font-medium text-2xl">{title}</Text>
						<Section>
							<Text>Hallo,</Text>
							<Text>
								Der Nutzer <strong className="font-medium">"{from}"</strong> hat einen
								neuen Spesenbericht über das Spesen-tool eingereicht.
							</Text>
							<Text>
								Wende dich bei Fragen bitte an{" "}
								<Button href="mailto:support@move-ev.de">support@move-ev.de</Button>.
							</Text>
							<Text>
								Beste Grüße,
								<br />
								Dein move e.V. Team
							</Text>
							<Hr />
							<Text className="text-xs text-zinc-500">
								Du erhältst diese E-Mail, da du in Zemio als Reviewer eingetragen
								bist. Solltest du kein Reviewer sein, kannst du diese E-Mail ignorieren.
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
};
