import type { ExpenseType, InputTaxRate, Prisma } from "@zemio/db";
import { decimalToNumber } from "@/server/shared/money";
import { foodDetailFromMeta, travelDetailFromMeta } from "./expense.meta";
import type { ExpenseDetail, ExpenseListItem } from "./expense.repository";

export type TravelExpenseDetailDTO = {
	from: string;
	to: string;
	distance: number;
};

export type FoodExpenseDetailDTO = {
	days: number;
	breakfastDeduction: number;
	lunchDeduction: number;
	dinnerDeduction: number;
};

export function toTravelExpenseDetailDTO(
	detail: { from: string; to: string; distance: Prisma.Decimal } | null,
): TravelExpenseDetailDTO | null {
	if (!detail) {
		return null;
	}
	return {
		from: detail.from,
		to: detail.to,
		distance: decimalToNumber(detail.distance),
	};
}

export function toFoodExpenseDetailDTO(
	detail: {
		days: number;
		breakfastDeduction: Prisma.Decimal;
		lunchDeduction: Prisma.Decimal;
		dinnerDeduction: Prisma.Decimal;
	} | null,
): FoodExpenseDetailDTO | null {
	if (!detail) {
		return null;
	}
	return {
		days: detail.days,
		breakfastDeduction: decimalToNumber(detail.breakfastDeduction),
		lunchDeduction: decimalToNumber(detail.lunchDeduction),
		dinnerDeduction: decimalToNumber(detail.dinnerDeduction),
	};
}

type ExpenseDetailSource = {
	type: ExpenseType;
	meta: Prisma.JsonValue | null;
	travelDetail: Parameters<typeof toTravelExpenseDetailDTO>[0];
	foodDetail: Parameters<typeof toFoodExpenseDetailDTO>[0];
};

/**
 * A TRAVEL/FOOD expense written by the pre-normalization app version during
 * the migration deploy window has no typed detail row yet; fall back to its
 * legacy `meta` until the contract-phase backfill re-run covers it.
 */
export function resolveTravelDetailDTO(
	expense: ExpenseDetailSource,
): TravelExpenseDetailDTO | null {
	if (expense.type !== "TRAVEL") {
		return null;
	}
	return (
		toTravelExpenseDetailDTO(expense.travelDetail) ??
		travelDetailFromMeta(expense.meta)
	);
}

export function resolveFoodDetailDTO(
	expense: ExpenseDetailSource,
): FoodExpenseDetailDTO | null {
	if (expense.type !== "FOOD") {
		return null;
	}
	return (
		toFoodExpenseDetailDTO(expense.foodDetail) ?? foodDetailFromMeta(expense.meta)
	);
}

export type ExpenseByIdDTO = {
	id: string;
	reportId: string;
	type: ExpenseType;
	amount: number;
	description: string | null;
	startDate: Date;
	endDate: Date;
	/**
	 * The input tax the submitter stated, for receipts. Exposed because the
	 * export turns it into a deduction claimed in the customer's name: the
	 * submitter has to be able to check what they answered, and the admin who
	 * pays the report — making it immutable — has to see what they are
	 * approving. Null on an allowance, which carries none, and on a row written
	 * before the column existed.
	 */
	inputTaxRate: InputTaxRate | null;
	travelDetail: TravelExpenseDetailDTO | null;
	foodDetail: FoodExpenseDetailDTO | null;
};

export function toExpenseByIdDTO(expense: ExpenseDetail): ExpenseByIdDTO {
	return {
		id: expense.id,
		reportId: expense.reportId,
		type: expense.type,
		amount: decimalToNumber(expense.amount),
		description: expense.description,
		startDate: expense.startDate,
		endDate: expense.endDate,
		inputTaxRate: expense.inputTaxRate,
		travelDetail: resolveTravelDetailDTO(expense),
		foodDetail: resolveFoodDetailDTO(expense),
	};
}

export type AttachmentListItemDTO = {
	id: string;
	expenseId: string;
	key: string;
	size: number;
	originalName: string;
	createdAt: Date;
	updatedAt: Date;
};

function toAttachmentListItemDTO(
	attachment: ExpenseListItem["attachments"][number],
): AttachmentListItemDTO {
	return {
		id: attachment.id,
		expenseId: attachment.expenseId,
		key: attachment.key,
		size: Number(attachment.size),
		originalName: attachment.originalName,
		createdAt: attachment.createdAt,
		updatedAt: attachment.updatedAt,
	};
}

export type ExpenseListItemDTO = {
	id: string;
	reportId: string;
	type: ExpenseType;
	amount: number;
	description: string | null;
	startDate: Date;
	endDate: Date;
	/** See {@link ExpenseByIdDTO.inputTaxRate}. */
	inputTaxRate: InputTaxRate | null;
	travelDetail: TravelExpenseDetailDTO | null;
	foodDetail: FoodExpenseDetailDTO | null;
	attachments: AttachmentListItemDTO[];
};

export function toExpenseListItemDTO(
	expense: ExpenseListItem,
): ExpenseListItemDTO {
	return {
		id: expense.id,
		reportId: expense.reportId,
		type: expense.type,
		amount: decimalToNumber(expense.amount),
		description: expense.description,
		startDate: expense.startDate,
		endDate: expense.endDate,
		inputTaxRate: expense.inputTaxRate,
		travelDetail: resolveTravelDetailDTO(expense),
		foodDetail: resolveFoodDetailDTO(expense),
		attachments: expense.attachments.map(toAttachmentListItemDTO),
	};
}
