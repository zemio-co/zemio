import type { ExpenseType, Prisma } from "@zemio/db";
import { decimalToNumber } from "@/server/shared/money";
import type { ExpenseDetail, ExpenseListItem } from "./expense.repository";

export type ExpenseByIdDTO = {
	id: string;
	reportId: string;
	type: ExpenseType;
	amount: number;
	description: string | null;
	startDate: Date;
	endDate: Date;
	meta: Prisma.JsonValue;
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
		meta: expense.meta,
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
	meta: Prisma.JsonValue;
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
		meta: expense.meta,
		attachments: expense.attachments.map(toAttachmentListItemDTO),
	};
}
