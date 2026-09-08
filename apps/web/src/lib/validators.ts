import {
	CostUnitColor,
	CostUnitStatus,
	ExpenseType,
	InputTaxRate,
	NotificationPreference,
} from "@zemio/db/enums";

import z from "zod";
import { parseCalendarDate } from "./calendar-date";

/**
 * A day the user types as `dd.MM.yyyy`, read through `parseCalendarDate`.
 *
 * Deliberately the same reader the router uses in
 * `server/modules/expense/expense.validators.ts`: these schemas only shape the
 * forms — the value that reaches the database is parsed again server-side — so
 * a client that accepted a string the server refuses would pass validation and
 * then fail the mutation with no field to point at. date-fns' `parse` did
 * exactly that, taking `01.03.26` for the year 26.
 */
const calendarDate = (requiredMessage: string, invalidMessage: string) =>
	z
		.string()
		.min(1, requiredMessage)
		.refine((value) => parseCalendarDate(value) !== null, {
			message: invalidMessage,
		})
		.transform((value) => parseCalendarDate(value) as Date);

/**
 * The input tax a receipt carries, as the three receipt forms validate it.
 *
 * One declaration rather than the same enum and the same message key written
 * out in each form: the key is what `FieldError` looks up, so a copy that fell
 * out of step would render the raw key at the user instead of a message.
 * Required and never defaulted — see `createReceiptExpenseSchema` in
 * `server/modules/expense/expense.validators.ts` for why.
 */
export const receiptInputTaxRateSchema = z.enum(InputTaxRate, {
	error: "expense.inputTaxRateRequired",
});

export const createReportSchema = z.object({
	title: z.string().min(1, "report.titleRequired"),
	description: z.string(),
	costUnitId: z.string().min(1, "report.costUnitRequired"),
	bankingDetailsId: z.string().min(1, "report.bankingDetailsRequired"),
});

export const ibanSchema = z
	.string()
	.regex(/^DE\d{2} \d{4} \d{4} \d{4} \d{4} \d{2}$/, {
		message: "banking.invalidIban",
	});

export const unformattedIbanSchema = z.string().regex(/^DE\d{20}$/, {
	message: "banking.invalidIban",
});

export const baseCreateExpenseSchema = z.object({
	description: z.string(),
	amount: z.number().min(0),
	startDate: calendarDate(
		"expense.startDateRequired",
		"expense.invalidStartDate",
	),
	endDate: calendarDate("expense.endDateRequired", "expense.invalidEndDate"),
	type: z.enum(ExpenseType),
	reportId: z.string().min(1),
});

export const attachmentInputSchema = z.object({
	key: z
		.string()
		.regex(/^attachment\/[^/]+\/[^/]+$/, "Ungültiges Anhang-Schlüsselformat"),
	size: z
		.number()
		.int()
		.nonnegative()
		.transform((n) => BigInt(n)),
	originalName: z.string().min(1),
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
		days: z.number().int().min(1),
		breakfastDeduction: z.number().min(0),
		lunchDeduction: z.number().min(0),
		dinnerDeduction: z.number().min(0),
	}),
);

export const updateUserNameSchema = z.object({
	name: z.string().min(1),
});

export const updateUserProfileSchema = z.object({
	name: z.string().min(1),
	image: z.string().nullable(),
	email: z.email(),
});

// Schema for form validation (formatted IBAN with spaces)
export const updatePreferencesSchema = z.object({
	notificationPreference: z.enum(NotificationPreference),
});

// Schema for server validation (unformatted IBAN without spaces)
export const updatePreferencesServerSchema = z.object({
	notificationPreference: z.enum(NotificationPreference),
});

export const updateMealAllowancesSchema = z.object({
	dailyFoodAllowance: z.number().min(0).multipleOf(0.01),
	breakfastDeduction: z.number().min(0).multipleOf(0.01),
	lunchDeduction: z.number().min(0).multipleOf(0.01),
	dinnerDeduction: z.number().min(0).multipleOf(0.01),
});

export const updateTravelAllowancesSchema = z.object({
	kilometerRate: z.number().min(0).multipleOf(0.01),
});

export const createCostUnitGroupSchema = z.object({
	title: z.string().min(1),
});

export const updateCostUnitGroupSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
});

export const deleteCostUnitGroupSchema = z.object({
	id: z.string().min(1),
});

export const createCostUnitSchema = z.object({
	tag: z.string().min(1),
	title: z.string().min(1),
	examples: z.string().array(),
	costUnitGroupId: z.string(),
	color: z.enum(CostUnitColor),
});

export const updateCostUnitSchema = z.object({
	id: z.string().min(1),
	tag: z.string().min(1),
	title: z.string().min(1),
	examples: z.string().array(),
	costUnitGroupId: z.string(),
	status: z.enum(CostUnitStatus),
	color: z.enum(CostUnitColor),
});

export const deleteCostUnitSchema = z.object({
	id: z.string().min(1),
});

/**
 * A plain ledger account number. DATEV's Konto field is numeric and holds nine
 * digits, so a stray space or letter would be written into the file and refused
 * on import.
 */
const datevAccountNumber = z
	.string()
	.regex(/^\d{1,9}$/, "datev.accountNumber")
	.nullable();

/**
 * The DATEV export configuration of one Mandant (DEV-21).
 *
 * Every field is nullable so a half-filled form can be saved: the values come
 * from the Kanzlei, an admin rarely has all nine at once, and the export's
 * preflight already names the ones still missing. Shared by the router and the
 * settings form, so there is one schema rather than two that can drift.
 *
 * The ranges are DATEV's own, from its header description — Beraternummer four
 * to seven digits, Mandantennummer one to five, Sachkontenlänge a single digit
 * from 4 to 8. Checked here, where a value is typed: a file refused on import
 * says nothing about which of thirty-one header fields was wrong.
 */
export const updateDatevSettingsSchema = z.object({
	datevBeraternummer: z
		.number()
		.int("datev.beraternummer")
		.min(1001, "datev.beraternummer")
		.max(9999999, "datev.beraternummer")
		.nullable(),
	datevMandantennummer: z
		.number()
		.int("datev.mandantennummer")
		.min(1, "datev.mandantennummer")
		.max(99999, "datev.mandantennummer")
		.nullable(),
	// The picker hands over `dd.MM.yyyy`, and an empty field means "not set".
	// Parsed here so the form and the router share one schema: a client copy
	// that transformed differently is exactly how the two drift apart.
	// Checked before the transform rather than after it: `parseCalendarDate`
	// answers null for a typo just as it does for an empty field, so
	// transforming first would store `31.02.2026` as "not configured" and the
	// export would then name the one field the admin had just filled in. The
	// picker is a free text input that fires on every keystroke, so a
	// half-written date reaching submit is the normal case, not the exotic one.
	datevWirtschaftsjahrBeginn: z
		.string()
		.refine((value) => value === "" || parseCalendarDate(value) !== null, {
			// A key, like every other message in this file: `FieldError` looks it
			// up under `validation` and renders anything unregistered verbatim.
			message: "datev.fiscalYearStart",
		})
		.transform((value) => (value === "" ? null : parseCalendarDate(value))),
	datevSachkontenlaenge: z
		.number()
		.int("datev.sachkontenlaenge")
		.min(4, "datev.sachkontenlaenge")
		.max(8, "datev.sachkontenlaenge")
		.nullable(),
	// Header field 27. SKR49 exists for Vereine, but nothing downstream maps to
	// it — accepting it here would promise support that is not there.
	datevKontenrahmen: z.enum(["03", "04"]).nullable(),
	datevExpenseAccountReceipt: datevAccountNumber,
	datevExpenseAccountTravel: datevAccountNumber,
	datevExpenseAccountFood: datevAccountNumber,
	datevContraAccount: datevAccountNumber,
	datevFestschreibung: z.boolean(),
});

export type UpdateDatevSettingsInput = z.infer<
	typeof updateDatevSettingsSchema
>;
