import { ExpenseType } from "@zemio/db/enums";
import { isValid, parse } from "date-fns";
import z from "zod";
import { attachmentInputSchema } from "@/server/modules/attachment";

export const baseCreateExpenseSchema = z.object({
	description: z.string(),
	amount: z.number().min(0),
	startDate: z
		.string()
		.min(1, "Startdatum ist erforderlich")
		.refine(
			(val) => {
				const date = parse(val, "dd.MM.yyyy", new Date());
				return isValid(date);
			},
			{ message: "Ungültiges Startdatum" },
		)
		.transform((val) => parse(val, "dd.MM.yyyy", new Date())),
	endDate: z
		.string()
		.min(1, "Enddatum ist erforderlich")
		.refine(
			(val) => {
				const date = parse(val, "dd.MM.yyyy", new Date());
				return isValid(date);
			},
			{ message: "Ungültiges Enddatum" },
		)
		.transform((val) => parse(val, "dd.MM.yyyy", new Date())),
	type: z.enum(ExpenseType),
	reportId: z.string().min(1),
});

export const createReceiptExpenseSchema = baseCreateExpenseSchema.and(
	z.object({
		attachments: attachmentInputSchema.array(),
	}),
);

export const createTravelExpenseSchema = baseCreateExpenseSchema.and(
	z.object({
		from: z.string().min(1),
		to: z.string().min(1),
		distance: z.number().min(0),
	}),
);

export const createFoodExpenseSchema = baseCreateExpenseSchema.and(
	z.object({
		days: z.number().min(1),
		breakfastDeduction: z.number().min(0),
		lunchDeduction: z.number().min(0),
		dinnerDeduction: z.number().min(0),
	}),
);

export const updateExpenseSchema = z.object({
	description: z.string().optional(),
	amount: z.number().min(0).optional(),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	from: z.string().min(1).optional(),
	to: z.string().min(1).optional(),
	distance: z.number().min(1).optional(),
	days: z.number().min(1).optional(),
	breakfastDeduction: z.number().min(0).optional(),
	lunchDeduction: z.number().min(0).optional(),
	dinnerDeduction: z.number().min(0).optional(),
});
