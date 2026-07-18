import { TRPCError } from "@trpc/server";
import { ReportStatus } from "@zemio/db";

export function isEditable(status: ReportStatus): boolean {
	return status === ReportStatus.DRAFT || status === ReportStatus.NEEDS_REVISION;
}

/**
 * Statuses from which a report **owner** may submit for approval. The owner flow
 * is deliberately strict; broader status changes go through the admin transition.
 */
const SUBMITTABLE_STATUSES: readonly ReportStatus[] = [
	ReportStatus.DRAFT,
	ReportStatus.NEEDS_REVISION,
];

/**
 * Allowed **admin** status overrides. Broader than the owner submit flow: admins
 * may re-open finalized reports. `DRAFT` is never a transition target.
 *
 * See `docs/trpc-migration-report-slice.md` for why this diverges from the
 * doc's literal (terminal-state) table.
 */
const ADMIN_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
	[ReportStatus.DRAFT]: [ReportStatus.PENDING_APPROVAL],
	[ReportStatus.PENDING_APPROVAL]: [
		ReportStatus.ACCEPTED,
		ReportStatus.REJECTED,
		ReportStatus.NEEDS_REVISION,
	],
	[ReportStatus.NEEDS_REVISION]: [
		ReportStatus.PENDING_APPROVAL,
		ReportStatus.ACCEPTED,
		ReportStatus.REJECTED,
	],
	[ReportStatus.ACCEPTED]: [
		ReportStatus.PENDING_APPROVAL,
		ReportStatus.NEEDS_REVISION,
		ReportStatus.REJECTED,
	],
	[ReportStatus.REJECTED]: [
		ReportStatus.PENDING_APPROVAL,
		ReportStatus.NEEDS_REVISION,
		ReportStatus.ACCEPTED,
	],
	[ReportStatus.PAID]: [],
};

export function canSubmit(from: ReportStatus): boolean {
	return SUBMITTABLE_STATUSES.includes(from);
}

export function assertSubmittable(from: ReportStatus): void {
	if (!canSubmit(from)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Report is not available for submission.",
		});
	}
}

export function assertAdminTransition(
	from: ReportStatus,
	to: ReportStatus,
): void {
	if (!ADMIN_TRANSITIONS[from].includes(to)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Illegal status transition: ${from} -> ${to}`,
		});
	}
}
