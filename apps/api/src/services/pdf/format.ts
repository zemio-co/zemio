import type { Expense, Report } from "@zemio/db";
import { createAppTranslator } from "@zemio/i18n";

const reportStatusKeys = {
	DRAFT: "draft",
	PENDING_APPROVAL: "pendingApproval",
	NEEDS_REVISION: "needsRevision",
	ACCEPTED: "accepted",
	REJECTED: "rejected",
	PAID: "paid",
} as const satisfies Record<Report["status"], string>;

const expenseTypeKeys = {
	RECEIPT: "receipt",
	TRAVEL: "travel",
	FOOD: "food",
} as const satisfies Record<Expense["type"], string>;

export function translateReportStatus(status: Report["status"]): string {
	const t = createAppTranslator({ namespace: "enums.reportStatus" });
	return t(reportStatusKeys[status]);
}

export function translateExpenseType(type: Expense["type"]): string {
	const t = createAppTranslator({ namespace: "enums.expenseType" });
	return t(expenseTypeKeys[type]);
}

export function formatEuroAmount(amount: number): string {
	return `${amount.toFixed(2)}€`;
}

export function toSnakeCaseFilenameSegment(value: string): string {
	const normalized = value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
	return (
		normalized
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.replace(/_+/g, "_") || "report"
	);
}
