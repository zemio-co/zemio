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
import type { ReactNode } from "react";

interface EmailLayoutProps {
	/** The line a mail client shows beside the subject. */
	preview: string;
	logoUrl: string;
	heading: ReactNode;
	/** Why the recipient is getting this mail, in small print below the line. */
	footer: ReactNode;
	/** What this mail says: its paragraphs and its call to action. */
	children: ReactNode;
}

/**
 * The frame every Zemio mail shares: the logo, the heading, how to reach
 * support, the sign-off and the footer.
 *
 * In one place so that branding, the support address and the sign-off change
 * once rather than in every template — each of which then holds only what it
 * actually says.
 */
export function EmailLayout({
	preview,
	logoUrl,
	heading,
	footer,
	children,
}: EmailLayoutProps) {
	const tShared = createAppTranslator({ namespace: "emails.shared" });

	return (
		<Html>
			<Head />
			<Tailwind config={{}}>
				<Body className="bg-zinc-50 font-sans">
					<Preview>{preview}</Preview>
					<Container className="bg-white px-6 py-8">
						<Img alt="zemio" className="h-5 w-fit" src={logoUrl} />
						<Text className="mt-16 font-medium text-2xl">{heading}</Text>
						<Section>
							{children}
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
							<Text className="text-xs text-zinc-500">{footer}</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
