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
 * On the create path this is where the date enters the database: the parallel
 * schemas in `lib/validators.ts` and `report/components/create-expense.tsx`
 * shape the forms, but their parsed values never reach a write, because the
 * forms submit the raw string and this one parses it again server-side.
 *
 * `updateExpenseSchema` below does **not** go through here yet — see the note
 * on its `startDate`/`endDate`.
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
	// Unlike the create path these take an instant, not a `dd.MM.yyyy` string, so
	// which day gets stored is decided on the client: Prisma writes a `@db.Date`
	// column from the Date's UTC components, so anything but UTC midnight loses a
	// day east of UTC. `report/components/report-update-expense.tsx` builds these
	// with `parseCalendarDate` for that reason — and because the edit form
	// resubmits both dates on every save, a client that used date-fns' `parse`
	// instead would walk them a day back each time the description was edited.
	//
	// The invariant is therefore the caller's, which is the weak spot: it would be
	// enforced here if the update carried the string and used `calendarDate(...)`
	// like `baseCreateExpenseSchema` does.
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
