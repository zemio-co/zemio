import { TRPCError } from "@trpc/server";
import type { ReportStatus } from "@zemio/db";
import { isEditable } from "@/server/modules/report/report.state";

export type ExpensePolicyContext = {
	userId: string;
	isOrgAdmin: boolean;
};

export type ExpenseSubject = {
	report: {
		ownerId: string;
		status: ReportStatus;
	};
};

export type ExpenseAction = "read" | "update" | "delete" | "addAttachment";

const RULES: Record<
	ExpenseAction,
	(ctx: ExpensePolicyContext, subject: ExpenseSubject) => boolean
> = {
	read: (ctx, { report }) => ctx.isOrgAdmin || report.ownerId === ctx.userId,
	update: (ctx, { report }) =>
		report.ownerId === ctx.userId && isEditable(report.status),
	delete: (ctx, { report }) =>
		report.ownerId === ctx.userId && isEditable(report.status),
	addAttachment: (ctx, { report }) =>
		report.ownerId === ctx.userId && isEditable(report.status),
};

export function canExpense(
	action: ExpenseAction,
	ctx: ExpensePolicyContext,
	subject: ExpenseSubject,
): boolean {
	return RULES[action](ctx, subject);
}

export function authorizeExpense(
	action: ExpenseAction,
	ctx: ExpensePolicyContext,
	subject: ExpenseSubject,
): void {
	if (!canExpense(action, ctx, subject)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You don't have access to this expense.",
		});
	}
}
