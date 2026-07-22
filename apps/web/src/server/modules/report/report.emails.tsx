import { NotificationPreference } from "@zemio/db";
import { createAppTranslator } from "@zemio/i18n";
import ReportReceivedEmail from "@/components/emails/report-received-email";
import ReportSubmittedEmail from "@/components/emails/report-submitted-email";
import StatusChangedEmail from "@/components/emails/status-changed-email";
import { DEFAULT_EMAIL_FROM } from "@/lib/consts";
import { getMailer } from "@/lib/email";
import { logger } from "@/lib/logger";
import {
	type ReportStatusChangedEvent,
	type ReportSubmittedEvent,
	reportEventBus,
} from "./report.events";

async function onReportSubmitted(event: ReportSubmittedEvent): Promise<void> {
	if (event.reviewerEmail) {
		const result = await getMailer().send({
			from: DEFAULT_EMAIL_FROM,
			to: [event.reviewerEmail],
			subject: createAppTranslator({ namespace: "emails.reportReceived" })(
				"subject",
			),
			react: (
				<ReportReceivedEmail
					from={event.ownerName}
					reportId={event.reportId}
					title={event.title}
				/>
			),
		});
		if (!result.ok) {
			logger.error("email.report_received_failed", {
				reportId: event.reportId,
				error: result.error,
			});
		}
	}

	if (event.ownerNotificationPref === NotificationPreference.ALL) {
		const result = await getMailer().send({
			from: DEFAULT_EMAIL_FROM,
			to: [event.ownerEmail],
			subject: createAppTranslator({ namespace: "emails.reportSubmitted" })(
				"subject",
			),
			react: <ReportSubmittedEmail name={event.ownerName} title={event.title} />,
		});
		if (!result.ok) {
			logger.error("email.report_submitted_failed", {
				reportId: event.reportId,
				error: result.error,
			});
		}
	}
}

async function onReportStatusChanged(
	event: ReportStatusChangedEvent,
): Promise<void> {
	if (
		!event.notify ||
		event.ownerNotificationPref === NotificationPreference.NONE
	) {
		return;
	}

	const result = await getMailer().send({
		from: DEFAULT_EMAIL_FROM,
		to: [event.ownerEmail],
		subject: createAppTranslator({ namespace: "emails.statusChanged" })(
			"subject",
		),
		react: (
			<StatusChangedEmail
				name={event.ownerName}
				reportId={event.reportId}
				status={event.status}
				title={event.title}
			/>
		),
	});
	if (!result.ok) {
		logger.error("email.status_changed_failed", {
			reportId: event.reportId,
			error: result.error,
		});
	}
}

let registered = false;

/**
 * Wires the email side-effects to the report event bus. Idempotent so importing
 * the router more than once (HMR / multiple entry points) does not double-send.
 */
export function registerReportEmailSubscribers(): void {
	if (registered) {
		return;
	}
	registered = true;
	reportEventBus.on("report.submitted", onReportSubmitted);
	reportEventBus.on("report.status_changed", onReportStatusChanged);
}
