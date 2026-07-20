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
	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>
						Der Status deines Spesenberichts wurde zu "{reportStatusLabel(status)}"
						geändert.
					</Preview>
					<Container className="bg-white px-6 py-8">
						<Img
							className="h-5 w-fit"
							src={`${baseUrl}/assets/zemio-logo-woodmark.png`}
						/>
						<Text className="mt-16 font-medium text-2xl">{title}</Text>
						<Section>
							<Text>Hallo {name},</Text>
							<Text>
								Der Status deines Spesenberichts{" "}
								<strong className="font-medium">"{title}"</strong> wurde zu{" "}
								<strong className="font-medium">{reportStatusLabel(status)}</strong>{" "}
								geändert. Du kannst den Bericht{" "}
								<Button href={`${baseUrl}${ROUTES.USER_REPORT_DETAILS(reportId)}`}>
									hier
								</Button>{" "}
								ansehen.
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

StatusChangedEmail.PreviewProps = {
	name: "John Doe",
	title: "Report 1",
	status: "PENDING_APPROVAL",
	reportId: "123",
};
