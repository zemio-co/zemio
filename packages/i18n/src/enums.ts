/**
 * Locally-declared mirrors of the Prisma `ReportStatus`/`ExpenseType` enum
 * values. Kept independent of `@zemio/db` so this package has no dependency
 * on the Prisma-generated client — callers pass in their own `@zemio/db`
 * enum values, which are structurally compatible with these string unions.
 */
export type ReportStatusValue =
	| "DRAFT"
	| "PENDING_APPROVAL"
	| "NEEDS_REVISION"
	| "ACCEPTED"
	| "REJECTED"
	| "PAID";

export type ExpenseTypeValue = "RECEIPT" | "TRAVEL" | "FOOD";

export const reportStatusKeys = {
	DRAFT: "draft",
	PENDING_APPROVAL: "pendingApproval",
	NEEDS_REVISION: "needsRevision",
	ACCEPTED: "accepted",
	REJECTED: "rejected",
	PAID: "paid",
} as const satisfies Record<ReportStatusValue, string>;

export const expenseTypeKeys = {
	RECEIPT: "receipt",
	TRAVEL: "travel",
	FOOD: "food",
} as const satisfies Record<ExpenseTypeValue, string>;
