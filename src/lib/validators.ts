import { isValid, parse } from "date-fns";
import z from "zod";
import { ExpenseType, NotificationPreference } from "@/generated/prisma/enums";

export const createReportSchema = z.object({
	title: z.string().min(1),
	description: z.string(),
	costUnitId: z.string().min(1),
	bankingDetailsId: z.string().min(1),
});

export const ibanSchema = z
	.string()
	.regex(/^DE\d{2} \d{4} \d{4} \d{4} \d{4} \d{2}$/, {
		message: "Ungültige IBAN",
	});

export const unformattedIbanSchema = z.string().regex(/^DE\d{20}$/, {
	message: "Ungültige IBAN",
});

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

export const attachmentInputSchema = z.object({
	key: z.string().min(1),
	size: z.number().int().nonnegative(),
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
		days: z.number().min(1),
		breakfastDeduction: z.number().min(0),
		lunchDeduction: z.number().min(0),
		dinnerDeduction: z.number().min(0),
	}),
);

// ================================ META FIELDS ================================

export const receiptExpenseMetaSchema = z.object({});

export const travelExpenseMetaSchema = z.object({
	from: z.string().min(1),
	to: z.string().min(1),
	distance: z.number().min(1),
});

export const foodExpenseMetaSchema = z.object({
	days: z.number().min(1),
	breakfastDeduction: z.number().min(0),
	lunchDeduction: z.number().min(0),
	dinnerDeduction: z.number().min(0),
});

export const updateUserNameSchema = z.object({
	name: z.string().min(1),
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
	dailyFoodAllowance: z.number().min(0),
	breakfastDeduction: z.number().min(0),
	lunchDeduction: z.number().min(0),
	dinnerDeduction: z.number().min(0),
});

export const updateTravelAllowancesSchema = z.object({
	kilometerRate: z.number().min(0),
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
});

export const updateCostUnitSchema = z.object({
	id: z.string().min(1),
	tag: z.string().min(1),
	title: z.string().min(1),
	examples: z.string().array(),
	costUnitGroupId: z.string(),
});

export const deleteCostUnitSchema = z.object({
	id: z.string().min(1),
});
