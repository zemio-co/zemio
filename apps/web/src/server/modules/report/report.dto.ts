import type {
	CostUnit,
	ExpenseType,
	InputTaxRate,
	Prisma,
	ReportStatus,
} from "@zemio/db";
import {
	decryptBankingDetails,
	type EncryptedBankingDetails,
} from "@/lib/banking/cryptic";
import {
	type FoodExpenseDetailDTO,
	resolveFoodDetailDTO,
	resolveTravelDetailDTO,
	type TravelExpenseDetailDTO,
} from "@/server/modules/expense/expense.dto";
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
	// Null when a draft's banking details were deleted before submission.
	iban: string | null;
	ownerName: string | null;
};

export function toFinancialSummaryDTO(
	bankingDetails: EncryptedBankingDetails | null,
	totalAmount: Prisma.Decimal | null,
): FinancialSummaryDTO {
	const decrypted = bankingDetails
		? decryptBankingDetails(bankingDetails)
		: null;
	return {
		totalAmount: nullableDecimalToNumber(totalAmount),
		iban: decrypted?.iban ?? null,
		ownerName: decrypted?.fullName ?? null,
	};
}

type ReviewExpenseDTO = {
	id: string;
	description: string | null;
	amount: number;
	startDate: Date;
	endDate: Date;
	type: ExpenseType;
	/** What the submitter stated; see ExpenseByIdDTO.inputTaxRate. */
	inputTaxRate: InputTaxRate | null;
	travelDetail: TravelExpenseDetailDTO | null;
	foodDetail: FoodExpenseDetailDTO | null;
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
		lastUpdatedAt: Date;
		paidAt: Date | null;
		owner: ReviewDetail["owner"];
		costUnit: Pick<CostUnit, "color" | "title" | "tag">;
	};
	// Null only for anomalous data: a report in review without a snapshot
	// whose live banking details were deleted.
	bankingSummary: { iban: string; ownerName: string } | null;
	totalAmount: number;
	expenses: ReviewExpenseDTO[];
	attachments: ReviewDetail["expenses"][number]["attachments"];
};

export function toReviewDTO(detail: ReviewDetail): ReviewDTO {
	// The snapshot holds what was actually submitted; the live relation only
	// backs legacy reports that predate snapshots.
	const bankingSource = detail.bankingSnapshot ?? detail.bankingDetails;
	const banking = bankingSource ? decryptBankingDetails(bankingSource) : null;

	const expenses: ReviewExpenseDTO[] = detail.expenses.map((expense) => ({
		id: expense.id,
		description: expense.description,
		amount: decimalToNumber(expense.amount),
		startDate: expense.startDate,
		endDate: expense.endDate,
		type: expense.type,
		inputTaxRate: expense.inputTaxRate,
		travelDetail: resolveTravelDetailDTO(expense),
		foodDetail: resolveFoodDetailDTO(expense),
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
			lastUpdatedAt: detail.lastUpdatedAt,
			paidAt: detail.paidAt,
			owner: detail.owner,
			costUnit: detail.costUnit,
		},
		bankingSummary: banking
			? { iban: banking.iban, ownerName: banking.fullName }
			: null,
		totalAmount,
		expenses,
		attachments,
	};
}
