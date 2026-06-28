import { TRPCError } from "@trpc/server";

export type AuditPolicyContext = {
	userId: string;
	isOrgAdmin: boolean;
};

export type AuditSubject = {
	ownerId: string;
};

export type AuditAction = "read" | "comment";

const RULES: Record<
	AuditAction,
	(ctx: AuditPolicyContext, subject: AuditSubject) => boolean
> = {
	read: (ctx, subject) => ctx.isOrgAdmin || subject.ownerId === ctx.userId,
	comment: (ctx, subject) => ctx.isOrgAdmin || subject.ownerId === ctx.userId,
};

export function canAudit(
	action: AuditAction,
	ctx: AuditPolicyContext,
	subject: AuditSubject,
): boolean {
	return RULES[action](ctx, subject);
}

export function authorizeAudit(
	action: AuditAction,
	ctx: AuditPolicyContext,
	subject: AuditSubject,
): void {
	if (!canAudit(action, ctx, subject)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You don't have access to this audit trail.",
		});
	}
}
