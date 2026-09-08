import { ExpenseType, InputTaxRate } from "@zemio/db/enums";
import z from "zod";
import { parseCalendarDate } from "@/lib/calendar-date";
import {
	attachmentInputSchema,
	MAX_ATTACHMENTS_PER_EXPENSE,
} from "@/server/modules/attachment";

/**
 * A day the client sends as `dd.MM.yyyy`, carried on as UTC midnight.
 *
 * This is the only place an expense date enters the database — the identical
 * schemas in `lib/validators.ts` and `report/components/create-expense.tsx`
 * shape the forms, but their parsed values never reach a write, because this
 * one takes the string and parses it again server-side.
 */
const calendarDate = (requiredMessage: string, invalidMessage: string) =>
	z
		.string()
		.min(1, requiredMessage)
		.transform((value) => parseCalendarDate(value))
		.refine((date): date is Date => date !== null, {
			message: invalidMessage,
		});

export const baseCreateExpenseSchema = z.object({
	description: z.string(),
	amount: z.number().min(0).multipleOf(0.01),
	startDate: calendarDate(
		"expense.startDateRequired",
		"expense.invalidStartDate",
	),
	endDate: calendarDate("expense.endDateRequired", "expense.invalidEndDate"),
	type: z.enum(ExpenseType),
	reportId: z.string().min(1),
});

export const createReceiptExpenseSchema = baseCreateExpenseSchema.and(
	z.object({
		// Creating a receipt sets the expense's entire attachment set, so the
		// per-expense total is the binding limit here, not the per-upload batch.
		attachments: attachmentInputSchema.array().max(MAX_ATTACHMENTS_PER_EXPENSE),

		/**
		 * The input tax the receipt shows, for the DATEV export.
		 *
		 * Required and deliberately not defaulted. A default of 19 % would claim a
		 * wrong deduction in the customer's name on every reduced-rate receipt, and
		 * a paid report can never be corrected — so "no input tax" has to be a
		 * choice the submitter makes rather than an absence nobody noticed. Only a
		 * receipt is asked: the two allowances have no invoice behind them.
		 */
		inputTaxRate: z.enum(InputTaxRate),
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
		days: z.number().int().min(1),
		breakfastDeduction: z.number().min(0).multipleOf(0.01),
		lunchDeduction: z.number().min(0).multipleOf(0.01),
		dinnerDeduction: z.number().min(0).multipleOf(0.01),
	}),
);

export const updateExpenseSchema = z.object({
	description: z.string().optional(),
	amount: z.number().min(0).multipleOf(0.01).optional(),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	from: z.string().min(1).optional(),
	to: z.string().min(1).optional(),
	distance: z.number().min(1).optional(),
	days: z.number().int().min(1).optional(),
	breakfastDeduction: z.number().min(0).multipleOf(0.01).optional(),
	lunchDeduction: z.number().min(0).multipleOf(0.01).optional(),
	dinnerDeduction: z.number().min(0).multipleOf(0.01).optional(),
	// Correctable while the report is still editable, which is the only window
	// there is: once it is paid, the rate it was exported with stands.
	inputTaxRate: z.enum(InputTaxRate).optional(),
});
