import type { Expense, Report } from "@zemio/db";

export function translateReportStatus(status: Report["status"]): string {
	switch (status) {
		case "DRAFT":
			return "Entwurf";
		case "PENDING_APPROVAL":
			return "In Bearbeitung";
		case "NEEDS_REVISION":
			return "Benötigt Überarbeitung";
		case "ACCEPTED":
			return "Akzeptiert";
		case "REJECTED":
			return "Abgelehnt";
		case "PAID":
			return "Ausgezahlt";
	}
}

export function translateExpenseType(type: Expense["type"]): string {
	switch (type) {
		case "RECEIPT":
			return "Beleg";
		case "TRAVEL":
			return "Reise";
		case "FOOD":
			return "Verpflegung";
	}
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
