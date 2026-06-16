import type { NotificationPreference, ReportStatus } from "@zemio/db";
import { EventBus } from "@/server/shared/events/bus";

export type ReportSubmittedEvent = {
	reportId: string;
	title: string;
	ownerName: string;
	ownerEmail: string;
	ownerNotificationPref: NotificationPreference | null;
	reviewerEmail: string | null;
};

export type ReportStatusChangedEvent = {
	reportId: string;
	title: string;
	status: ReportStatus;
	ownerName: string;
	ownerEmail: string;
	ownerNotificationPref: NotificationPreference | null;
	notify: boolean;
};

export type ReportEventMap = {
	"report.submitted": ReportSubmittedEvent;
	"report.status_changed": ReportStatusChangedEvent;
};

/** Emits the report's `emit`-only surface so consumers can't accidentally subscribe via the service. */
export type ReportEventEmitter = Pick<EventBus<ReportEventMap>, "emit">;

export const reportEventBus = new EventBus<ReportEventMap>();
