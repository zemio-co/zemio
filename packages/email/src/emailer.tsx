import { createAppTranslator } from "@zemio/i18n";
import {
	createScalewayClient,
	type EmailAddress,
	type SendResult,
} from "./client/scaleway";
import EmailVerificationEmail from "./templates/email-verification";
import OrgInvitationEmail from "./templates/org-invitation";
import ReportReceivedEmail from "./templates/report-received";
import ReportSubmittedEmail from "./templates/report-submitted";
import StatusChangedEmail from "./templates/status-changed";

export interface EmailerConfig {
	/** Scaleway IAM secret key, sent as `X-Auth-Token`. */
	apiKey: string;
	/** Scaleway project the sending domain belongs to. */
	projectId: string;
	from: EmailAddress;
	/** Absolute base URL of the app. Resolves image assets in the templates. */
	appUrl: string;
}

export interface ReportReceivedInput {
	to: string;
	title: string;
	submittedBy: string;
	/** Absolute URL of the report in the review UI. */
	reportUrl: string;
}

export interface ReportSubmittedInput {
	to: string;
	name: string;
	title: string;
}

export interface StatusChangedInput {
	to: string;
	name: string;
	title: string;
	/** Already translated: the caller owns the locale. */
	statusLabel: string;
	/** Absolute URL of the report for its owner. */
	reportUrl: string;
}

export interface OrgInvitationInput {
	to: string;
	organizationName: string;
	inviterName: string;
	/** Absolute URL that accepts the invitation. */
	acceptUrl: string;
}

export interface EmailVerificationInput {
	to: string;
	/** Absolute URL that marks the address verified. */
	verifyUrl: string;
}

export interface Emailer {
	sendReportReceived(input: ReportReceivedInput): Promise<SendResult>;
	sendReportSubmitted(input: ReportSubmittedInput): Promise<SendResult>;
	sendStatusChanged(input: StatusChangedInput): Promise<SendResult>;
	sendOrgInvitation(input: OrgInvitationInput): Promise<SendResult>;
	sendEmailVerification(input: EmailVerificationInput): Promise<SendResult>;
}

/**
 * The only way to send mail. Templates and the transport stay internal so a
 * caller cannot assemble a send of its own and drift from these five.
 */
export function createEmailer({
	apiKey,
	projectId,
	from,
	appUrl,
}: EmailerConfig): Emailer {
	const client = createScalewayClient({ apiKey, projectId });
	const logoUrl = new URL("/assets/zemio-logo-woodmark.png", appUrl).toString();

	return {
		sendReportReceived({ to, title, submittedBy, reportUrl }) {
			return client.send({
				from,
				to: [to],
				subject: createAppTranslator({ namespace: "emails.reportReceived" })(
					"subject",
				),
				react: (
					<ReportReceivedEmail
						logoUrl={logoUrl}
						reportUrl={reportUrl}
						submittedBy={submittedBy}
						title={title}
					/>
				),
			});
		},

		sendReportSubmitted({ to, name, title }) {
			return client.send({
				from,
				to: [to],
				subject: createAppTranslator({ namespace: "emails.reportSubmitted" })(
					"subject",
				),
				react: <ReportSubmittedEmail logoUrl={logoUrl} name={name} title={title} />,
			});
		},

		sendStatusChanged({ to, name, title, statusLabel, reportUrl }) {
			return client.send({
				from,
				to: [to],
				subject: createAppTranslator({ namespace: "emails.statusChanged" })(
					"subject",
				),
				react: (
					<StatusChangedEmail
						logoUrl={logoUrl}
						name={name}
						reportUrl={reportUrl}
						statusLabel={statusLabel}
						title={title}
					/>
				),
			});
		},

		sendOrgInvitation({ to, organizationName, inviterName, acceptUrl }) {
			return client.send({
				from,
				to: [to],
				subject: createAppTranslator({ namespace: "emails.orgInvitation" })(
					"subject",
					{ organization: organizationName },
				),
				react: (
					<OrgInvitationEmail
						acceptUrl={acceptUrl}
						inviterName={inviterName}
						logoUrl={logoUrl}
						organizationName={organizationName}
					/>
				),
			});
		},

		sendEmailVerification({ to, verifyUrl }) {
			return client.send({
				from,
				to: [to],
				subject: createAppTranslator({ namespace: "emails.emailVerification" })(
					"subject",
				),
				react: <EmailVerificationEmail logoUrl={logoUrl} verifyUrl={verifyUrl} />,
			});
		},
	};
}
