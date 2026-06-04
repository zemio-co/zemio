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
import type { ReportStatus } from "@/generated/prisma/enums";
import { translateReportStatus } from "@/lib/utils";

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
	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="font-sans">
					<Preview>
						Der Status deines Spesenberichts wurde zu "{translateReportStatus(status)}
						" geändert.
					</Preview>
					<Container>
						<Text className="font-medium text-2xl">
							Status geändert: {translateReportStatus(status)}
						</Text>
						<Section>
							<Text>Hallo {name},</Text>
							<Text>
								Der Status deines Spesenberichts{" "}
								<strong className="font-medium">"{title}"</strong> wurde zu{" "}
								<strong className="font-medium">{translateReportStatus(status)}</strong>{" "}
								geändert. Du kannst den Bericht{" "}
								<Button href={`${baseUrl}/reports/${reportId}`}>hier</Button> ansehen.
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
								Du erhältst diese E-Mail, da du einen Spesenbericht erstellt hast und
								der Status des Berichts geändert wurde. Solltest du keinen Spesenbericht
								erstellt haben, kannst du diese E-Mail ignorieren.
							</Text>
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
