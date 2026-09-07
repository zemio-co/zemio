import {
	CostUnitColor,
	CostUnitStatus,
	ExpenseType,
	NotificationPreference,
} from "@zemio/db/enums";

import { isValid, parse } from "date-fns";
import z from "zod";
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
	startDate: z
		.string()
		.min(1, "expense.startDateRequired")
		.refine(
			(val) => {
				const date = parse(val, "dd.MM.yyyy", new Date());
				return isValid(date);
			},
			{ message: "expense.invalidStartDate" },
		)
		.transform((val) => parse(val, "dd.MM.yyyy", new Date())),
	endDate: z
		.string()
		.min(1, "expense.endDateRequired")
		.refine(
			(val) => {
				const date = parse(val, "dd.MM.yyyy", new Date());
				return isValid(date);
			},
			{ message: "expense.invalidEndDate" },
		)
		.transform((val) => parse(val, "dd.MM.yyyy", new Date())),
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

// Trimmed before the length is checked, because onboarding reads a name as
// missing when it trims to nothing: a schema that accepted `"   "` would let
// somebody past the name step and then bounce them back to it forever.
export const updateUserNameSchema = z.object({
	name: z.string().trim().min(1).max(100),
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
