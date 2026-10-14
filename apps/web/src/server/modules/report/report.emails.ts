import { NotificationPreference } from "@zemio/db";
import { reportStatusLabel } from "@/lib/i18n-labels";
import { ROUTES } from "@/lib/routes";
import { absoluteUrl, getEmailer, logSend } from "@/server/email";
import {
	type ReportStatusChangedEvent,
	type ReportSubmittedEvent,
	reportEventBus,
} from "./report.events";

async function onReportSubmitted(event: ReportSubmittedEvent): Promise<void> {
	const emailer = getEmailer();

	if (event.reviewerEmail) {
		const result = await emailer.sendReportReceived({
			to: event.reviewerEmail,
			title: event.title,
			submittedBy: event.ownerName,
			reportUrl: absoluteUrl(ROUTES.ADMIN_REVIEW_REPORT(event.reportId)),
		});
		logSend("email.report_received", result, { reportId: event.reportId });
	}

	if (event.ownerNotificationPref === NotificationPreference.ALL) {
		const result = await emailer.sendReportSubmitted({
			to: event.ownerEmail,
			name: event.ownerName,
			title: event.title,
		});
		logSend("email.report_submitted", result, { reportId: event.reportId });
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

	const result = await getEmailer().sendStatusChanged({
		to: event.ownerEmail,
		name: event.ownerName,
		title: event.title,
		statusLabel: reportStatusLabel(event.status),
		reportUrl: absoluteUrl(ROUTES.USER_REPORT_DETAILS(event.reportId)),
	});
	logSend("email.status_changed", result, { reportId: event.reportId });
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
