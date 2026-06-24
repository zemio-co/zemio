import { TRPCError } from "@trpc/server";
import type { ReportStatus } from "@zemio/db";
import { isEditable } from "@/server/modules/report/report.state";

export type AttachmentPolicyContext = {
	userId: string;
	isOrgAdmin: boolean;
};

export type AttachmentSubject = {
	report: {
		ownerId: string;
		status: ReportStatus;
	};
};

export type AttachmentAction = "read" | "delete";

const RULES: Record<
	AttachmentAction,
	(ctx: AttachmentPolicyContext, subject: AttachmentSubject) => boolean
> = {
	read: (ctx, { report }) => ctx.isOrgAdmin || report.ownerId === ctx.userId,
	delete: (ctx, { report }) =>
		report.ownerId === ctx.userId && isEditable(report.status),
};

export function canAttachment(
	action: AttachmentAction,
	ctx: AttachmentPolicyContext,
	subject: AttachmentSubject,
): boolean {
	return RULES[action](ctx, subject);
}

export function authorizeAttachment(
	action: AttachmentAction,
	ctx: AttachmentPolicyContext,
	subject: AttachmentSubject,
): void {
	if (!canAttachment(action, ctx, subject)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You don't have access to this attachment.",
		});
	}
}
