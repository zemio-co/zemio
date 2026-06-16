import type { ExpenseType, Prisma, ReportStatus } from "@zemio/db";
import {
	decryptBankingDetails,
	type EncryptedBankingDetails,
} from "@/lib/banking/cryptic";
import {
	decimalToNumber,
	nullableDecimalToNumber,
} from "@/server/shared/money";
import type {
	ReportDetail,
	ReportListRow,
	ReviewDetail,
} from "./report.repository";

/** Single report, owner-facing detail view. */
export type ReportDetailDTO = Omit<ReportDetail, "owner"> & {
	owner: Pick<ReportDetail["owner"], "id" | "name" | "email" | "image">;
};

export function toReportDetailDTO(report: ReportDetail): ReportDetailDTO {
	const { owner, ...scalars } = report;
	return {
		...scalars,
		owner: {
			id: owner.id,
			name: owner.name,
			email: owner.email,
			image: owner.image,
		},
	};
}

/** A row in the report list, carrying its expense total. */
export type ReportListItemDTO = ReportListRow & { sum: number };

export function toReportListItemDTO(
	row: ReportListRow,
	sum: number,
): ReportListItemDTO {
	return { ...row, sum };
}

export type FinancialSummaryDTO = {
	totalAmount: number;
	iban: string;
	ownerName: string;
};

export function toFinancialSummaryDTO(
	bankingDetails: EncryptedBankingDetails,
	totalAmount: Prisma.Decimal | null,
): FinancialSummaryDTO {
	const decrypted = decryptBankingDetails(bankingDetails);
	return {
		totalAmount: nullableDecimalToNumber(totalAmount),
		iban: decrypted.iban,
		ownerName: decrypted.fullName,
	};
}

type ReviewExpenseDTO = {
	id: string;
	description: string | null;
	amount: number;
	startDate: Date;
	endDate: Date;
	type: ExpenseType;
	meta: Prisma.JsonValue;
	reportId: string;
};

export type ReviewDTO = {
	report: {
		id: string;
		tag: number;
		readableId: string;
		title: string;
		description: string | null;
		status: ReportStatus;
		createdAt: Date;
		owner: ReviewDetail["owner"];
	};
	bankingSummary: { iban: string; ownerName: string };
	totalAmount: number;
	expenses: ReviewExpenseDTO[];
	attachments: ReviewDetail["expenses"][number]["attachments"];
};

export function toReviewDTO(detail: ReviewDetail): ReviewDTO {
	const banking = decryptBankingDetails(detail.bankingDetails);

	const expenses: ReviewExpenseDTO[] = detail.expenses.map((expense) => ({
		id: expense.id,
		description: expense.description,
		amount: decimalToNumber(expense.amount),
		startDate: expense.startDate,
		endDate: expense.endDate,
		type: expense.type,
		meta: expense.meta,
		reportId: expense.reportId,
	}));

	const attachments = detail.expenses.flatMap((expense) => expense.attachments);

	const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

	return {
		report: {
			id: detail.id,
			tag: detail.tag,
			readableId: detail.tag.toString(),
			title: detail.title,
			description: detail.description,
			status: detail.status,
			createdAt: detail.createdAt,
			owner: detail.owner,
		},
		bankingSummary: { iban: banking.iban, ownerName: banking.fullName },
		totalAmount,
		expenses,
		attachments,
	};
}
