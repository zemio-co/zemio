import { TRPCError } from "@trpc/server";
import { ReportStatus } from "@zemio/db";

/**
 * The request-scoped facts an authorization decision is derived from. Resolved
 * once from the tRPC context — no second Better-Auth round trip per check.
 */
export type ReportPolicyContext = {
	userId: string;
	isOrgAdmin: boolean;
};

/** The minimal projection of a report needed to make an authorization decision. */
export type ReportSubject = {
	ownerId: string;
	status: ReportStatus;
};

export type ReportAction =
	| "read"
	| "update"
	| "submit"
	| "delete"
	| "transition"
	| "review";

function isEditable(status: ReportStatus): boolean {
	return status === ReportStatus.DRAFT || status === ReportStatus.NEEDS_REVISION;
}

const RULES: Record<
	ReportAction,
	(ctx: ReportPolicyContext, subject: ReportSubject) => boolean
> = {
	read: (ctx, report) => ctx.isOrgAdmin || report.ownerId === ctx.userId,
	update: (ctx, report) =>
		report.ownerId === ctx.userId && isEditable(report.status),
	submit: (ctx, report) =>
		report.ownerId === ctx.userId && isEditable(report.status),
	delete: (ctx, report) =>
		report.ownerId === ctx.userId && isEditable(report.status),
	transition: (ctx) => ctx.isOrgAdmin,
	review: (ctx) => ctx.isOrgAdmin,
};

export function canReport(
	action: ReportAction,
	ctx: ReportPolicyContext,
	subject: ReportSubject,
): boolean {
	return RULES[action](ctx, subject);
}

/** Throws a typed `FORBIDDEN` when the action is not permitted. */
export function authorizeReport(
	action: ReportAction,
	ctx: ReportPolicyContext,
	subject: ReportSubject,
): void {
	if (!canReport(action, ctx, subject)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You don't have access to this report.",
		});
	}
}
