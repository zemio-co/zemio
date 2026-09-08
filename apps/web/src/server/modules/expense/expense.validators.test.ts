import { describe, expect, it } from "vitest";
import {
	createFoodExpenseSchema,
	createReceiptExpenseSchema,
	createTravelExpenseSchema,
	updateExpenseSchema,
} from "./expense.validators";

const receipt = {
	reportId: "report_1",
	type: "RECEIPT" as const,
	description: "Büromaterial",
	amount: 24.9,
	startDate: "14.08.2026",
	endDate: "14.08.2026",
	attachments: [],
	inputTaxRate: "STANDARD" as const,
};

describe("createReceiptExpenseSchema", () => {
	it("accepts a receipt that states its input tax", () => {
		expect(createReceiptExpenseSchema.safeParse(receipt).success).toBe(true);
	});

	it("requires the input tax to be stated", () => {
		// Deliberately not defaulted: 19 % on a 7 % receipt is a wrong deduction
		// claimed in the customer's name, and a PAID report can never be corrected.
		// "No input tax" is a choice the submitter makes, not an absence.
		const { inputTaxRate, ...withoutRate } = receipt;

		expect(createReceiptExpenseSchema.safeParse(withoutRate).success).toBe(false);
	});

	it("takes each of the three rates a receipt can carry", () => {
		for (const inputTaxRate of ["STANDARD", "REDUCED", "NONE"] as const) {
			expect(
				createReceiptExpenseSchema.safeParse({ ...receipt, inputTaxRate }).success,
			).toBe(true);
		}
	});

	it("refuses a rate that is not one of them", () => {
		expect(
			createReceiptExpenseSchema.safeParse({ ...receipt, inputTaxRate: "19" })
				.success,
		).toBe(false);
	});

	it("reads the dates as the days they name, at UTC midnight", () => {
		const parsed = createReceiptExpenseSchema.parse(receipt);

		expect(parsed.startDate.toISOString()).toBe("2026-08-14T00:00:00.000Z");
	});
});

describe("the allowance schemas", () => {
	// A Kilometerpauschale and a Verpflegungspauschale have no invoice behind
	// them, so there is no input tax to state and no field to state it in.
	const dates = { startDate: "14.08.2026", endDate: "14.08.2026" };
	const base = { reportId: "report_1", amount: 37.2, description: "", ...dates };

	it("does not ask a travel allowance for an input tax rate", () => {
		const parsed = createTravelExpenseSchema.parse({
			...base,
			type: "TRAVEL",
			from: "Münster",
			to: "Köln",
			distance: 124,
		});

		expect("inputTaxRate" in parsed).toBe(false);
	});

	it("does not ask a food allowance for one either", () => {
		const parsed = createFoodExpenseSchema.parse({
			...base,
			type: "FOOD",
			days: 2,
			breakfastDeduction: 0,
			lunchDeduction: 0,
			dinnerDeduction: 0,
		});

		expect("inputTaxRate" in parsed).toBe(false);
	});
});

describe("updateExpenseSchema", () => {
	it("lets a submitter correct the rate while the report is still editable", () => {
		expect(
			updateExpenseSchema.safeParse({ inputTaxRate: "REDUCED" }).success,
		).toBe(true);
	});

	it("leaves the rate alone when the update does not mention it", () => {
		const parsed = updateExpenseSchema.parse({ amount: 30 });

		expect(parsed.inputTaxRate).toBeUndefined();
	});
});
