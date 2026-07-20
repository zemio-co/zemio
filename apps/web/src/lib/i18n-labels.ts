import type { ExpenseType, ReportStatus } from "@zemio/db";
import { createAppTranslator } from "@zemio/i18n";
import { useTranslations } from "next-intl";

export const reportStatusKeys = {
	DRAFT: "draft",
	PENDING_APPROVAL: "pendingApproval",
	NEEDS_REVISION: "needsRevision",
	ACCEPTED: "accepted",
	REJECTED: "rejected",
	PAID: "paid",
} as const satisfies Record<ReportStatus, string>;

export const expenseTypeKeys = {
	RECEIPT: "receipt",
	TRAVEL: "travel",
	FOOD: "food",
} as const satisfies Record<ExpenseType, string>;

/** Client-component hook — resolves through the active next-intl locale. */
export function useReportStatusLabel(status: ReportStatus): string {
	const t = useTranslations("enums.reportStatus");
	return t(reportStatusKeys[status]);
}

/** Client-component hook — resolves through the active next-intl locale. */
export function useExpenseTypeLabel(type: ExpenseType): string {
	const t = useTranslations("enums.expenseType");
	return t(expenseTypeKeys[type]);
}

/**
 * For contexts where hooks aren't legal (table column defs evaluated at
 * module scope, server-only services, PDF generation, emails). Not
 * locale-reactive — fine while only "de" ships.
 */
export function reportStatusLabel(status: ReportStatus): string {
	const t = createAppTranslator({ namespace: "enums.reportStatus" });
	return t(reportStatusKeys[status]);
}

/**
 * For contexts where hooks aren't legal (table column defs evaluated at
 * module scope, server-only services, PDF generation, emails). Not
 * locale-reactive — fine while only "de" ships.
 */
export function expenseTypeLabel(type: ExpenseType): string {
	const t = createAppTranslator({ namespace: "enums.expenseType" });
	return t(expenseTypeKeys[type]);
}
