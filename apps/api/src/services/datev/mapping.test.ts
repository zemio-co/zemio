import { describe, expect, it } from "bun:test";
import {
	type DatevAccounts,
	type ExportableExpense,
	type ExportableReport,
	toBookings,
} from "./mapping";

const accounts: DatevAccounts = {
	expenseAccountReceipt: "4980",
	expenseAccountTravel: "4670",
	expenseAccountFood: "4664",
	contraAccount: "1200",
};

function report(overrides: Partial<ExportableReport> = {}): ExportableReport {
	return {
		tag: 42,
		title: "Sommerfest",
		paidAt: new Date(Date.UTC(2026, 7, 31)),
		costUnit: { tag: "MARKETING" },
		expenses: [],
		...overrides,
	};
}

const receipt: ExportableExpense = {
	id: "exp_a",
	description: "Büromaterial",
	amount: 24.9,
	startDate: new Date(Date.UTC(2026, 7, 14)),
	type: "RECEIPT",
	inputTaxRate: "STANDARD",
	travelDetail: null,
};

describe("toBookings", () => {
	it("turns a receipt into one booking against the receipt account", () => {
		const [booking, ...rest] = toBookings(
			[report({ expenses: [receipt] })],
			accounts,
		);

		expect(rest).toHaveLength(0);
		expect(booking).toEqual({
			umsatz: 24.9,
			sollHaben: "S",
			konto: "4980",
			gegenkonto: "1200",
			buSchluessel: "9",
			belegdatum: new Date(Date.UTC(2026, 7, 31)),
			belegfeld1: "42-1",
			buchungstext: "Sommerfest – 14.08.2026, Büromaterial",
			kostenstelle: "MARKETING",
		});
	});

	describe("BU-Schlüssel", () => {
		const of = (expense: Partial<ExportableExpense>) =>
			toBookings([report({ expenses: [{ ...receipt, ...expense }] })], accounts)[0]
				?.buSchluessel;

		it("maps the two German input tax rates to DATEV's keys", () => {
			expect(of({ inputTaxRate: "STANDARD" })).toBe("9");
			expect(of({ inputTaxRate: "REDUCED" })).toBe("8");
		});

		it("stays empty where no input tax is claimed", () => {
			expect(of({ inputTaxRate: "NONE" })).toBeUndefined();
		});

		it("stays empty for rows written before the column existed", () => {
			// Null means nobody ever entered a rate, so claiming one would invent a
			// deduction. PAID reports are immutable, so these can never be filled in.
			expect(of({ inputTaxRate: null })).toBeUndefined();
		});

		it("never claims input tax on a Pauschale, whatever the row holds", () => {
			// A Kilometerpauschale and a Verpflegungspauschale have no invoice behind
			// them, so there is nothing to deduct.
			expect(of({ type: "TRAVEL", inputTaxRate: "STANDARD" })).toBeUndefined();
			expect(of({ type: "FOOD", inputTaxRate: "STANDARD" })).toBeUndefined();
		});
	});

	describe("Buchungstext", () => {
		const textOf = (
			expense: Partial<ExportableExpense>,
			overrides: Partial<ExportableReport> = {},
		) =>
			toBookings(
				[report({ expenses: [{ ...receipt, ...expense }], ...overrides })],
				accounts,
			)[0]?.buchungstext;

		it("names the route and distance on a travel allowance", () => {
			// Without the route a Kilometerpauschale cannot be followed up later.
			expect(
				textOf({
					type: "TRAVEL",
					description: "Anfahrt",
					travelDetail: { from: "Münster", to: "Köln", distance: 124 },
				}),
			).toBe("Sommerfest – 14.08.2026, Anfahrt, Münster nach Köln, 124 km");
		});

		it("falls back to the expense type when there is no description", () => {
			expect(textOf({ description: null })).toBe("Sommerfest – 14.08.2026, Beleg");
			expect(textOf({ type: "FOOD", description: null, inputTaxRate: null })).toBe(
				"Sommerfest – 14.08.2026, Verpflegung",
			);
		});

		it("writes a fractional distance with a German comma", () => {
			expect(
				textOf({
					type: "TRAVEL",
					description: null,
					travelDetail: { from: "Bonn", to: "Köln", distance: 32.5 },
				}),
			).toBe("Sommerfest – 14.08.2026, Bonn nach Köln, 32,50 km");
		});

		it("stays within the 60 characters DATEV allows for the field", () => {
			const text = textOf({
				description: "Verpflegung und Getränke für das gesamte Sommerfest-Team",
			});

			expect(text?.length).toBeLessThanOrEqual(60);
		});

		it("cuts the title, not the detail, when the two do not both fit", () => {
			// The detail is what tells one booking from the next, and on a travel
			// allowance it carries the route the amount is derived from. Cutting the
			// whole text from the right would drop exactly that.
			const [booking] = toBookings(
				[
					report({
						title: "Sommerfest der Fachschaft Wirtschaftswissenschaften 2026",
						expenses: [
							{
								...receipt,
								type: "TRAVEL",
								description: null,
								travelDetail: { from: "Münster", to: "Köln", distance: 124 },
							},
						],
					}),
				],
				accounts,
			);

			expect(booking?.buchungstext).toBe(
				"Sommerfest der Fachs – 14.08.2026, Münster nach Köln, 124 km",
			);
			expect(booking?.buchungstext).toHaveLength(60);
		});

		it("does not double the space before the separator", () => {
			// `Report.title` is validated as non-empty, not as non-blank, so it can
			// arrive padded — and the cut that fits a long title into the field can
			// land on a space of its own.
			const [padded] = toBookings(
				[report({ title: "Sommerfest  ", expenses: [receipt] })],
				accounts,
			);
			expect(padded?.buchungstext).toBe("Sommerfest – 14.08.2026, Büromaterial");

			const [cut] = toBookings(
				[
					report({
						// 20 characters in, which is exactly the room the detail leaves,
						// the title has a space.
						title: "Sommerfest der Fach Wirtschaftswissenschaften",
						expenses: [
							{
								...receipt,
								type: "TRAVEL",
								description: null,
								travelDetail: { from: "Münster", to: "Köln", distance: 124 },
							},
						],
					}),
				],
				accounts,
			);
			expect(cut?.buchungstext).toBe(
				"Sommerfest der Fach – 14.08.2026, Münster nach Köln, 124 km",
			);
		});

		it("writes the detail alone when the title is blank", () => {
			// A bare separator with nothing in front of it reads as a truncation bug
			// in the Kanzlei's ledger.
			expect(textOf({}, { title: "   " })).toBe("14.08.2026, Büromaterial");
		});

		it("keeps the detail when it fills the field on its own", () => {
			const text = textOf({
				description:
					"Getränke, Kuchen und Kaffee für das ganze Sommerfest-Team 2026",
			});

			// No room for any of the title, so the detail alone is written rather
			// than a bare separator with nothing in front of it. The date leads the
			// detail, so what gives way is the description — never the date.
			expect(text).toBe(
				"14.08.2026, Getränke, Kuchen und Kaffee für das ganze Sommer",
			);
			expect(text).toHaveLength(60);
		});
	});

	describe("Belegdatum", () => {
		it("is the payment date, not the date on the receipt", () => {
			// The Belegdatum is written as four digits, TTMM, with the year taken
			// from the Wirtschaftsjahr in the header. Dating it by the receipt would
			// put a December receipt paid in August under the wrong year with nothing
			// in the file looking wrong. paidAt is inside the exported period by
			// construction, so it can never fall outside the header's year.
			const [booking] = toBookings(
				[
					report({
						paidAt: new Date(Date.UTC(2026, 7, 31)),
						expenses: [{ ...receipt, startDate: new Date(Date.UTC(2025, 11, 20)) }],
					}),
				],
				accounts,
			);

			expect(booking?.belegdatum).toEqual(new Date(Date.UTC(2026, 7, 31)));
		});

		it("keeps the receipt's own date in the Buchungstext", () => {
			// Since the Belegdatum no longer carries it, the text is the only place
			// left that says which period the cost economically belongs to — and a
			// receipt from the previous year is exactly what a Steuerberater needs
			// to see. Written in full, because the year can differ from the payment.
			const [booking] = toBookings(
				[
					report({
						paidAt: new Date(Date.UTC(2026, 7, 31)),
						expenses: [
							{
								...receipt,
								description: "Büromaterial",
								startDate: new Date(Date.UTC(2025, 11, 20)),
							},
						],
					}),
				],
				accounts,
			);

			expect(booking?.buchungstext).toBe("Sommerfest – 20.12.2025, Büromaterial");
		});
	});

	it("books each expense type against its own account", () => {
		const bookings = toBookings(
			[
				report({
					expenses: [
						{ ...receipt, id: "exp_a", type: "RECEIPT" },
						{ ...receipt, id: "exp_b", type: "TRAVEL" },
						{ ...receipt, id: "exp_c", type: "FOOD" },
					],
				}),
			],
			accounts,
		);

		expect(bookings.map((b) => b.konto)).toEqual(["4980", "4670", "4664"]);
		expect(bookings.map((b) => b.gegenkonto)).toEqual(["1200", "1200", "1200"]);
	});

	it("books a repayment to Haben with the amount left unsigned", () => {
		// DATEV's Umsatz field carries no sign — the direction of the booking is
		// the Soll/Haben-Kennzeichen alone, and the serializer refuses a negative
		// amount outright rather than writing one.
		const [booking] = toBookings(
			[report({ expenses: [{ ...receipt, amount: -24.9 }] })],
			accounts,
		);

		expect(booking?.umsatz).toBe(24.9);
		expect(booking?.sollHaben).toBe("H");
	});

	it("leaves out a zero booking, which DATEV rejects", () => {
		// Zero is the one amount that cannot be written: it books nothing anyway,
		// and unlike a negative one there is no Soll/Haben direction that would
		// make it a valid row. The preflight tells the admin it happened.
		const bookings = toBookings(
			[
				report({
					expenses: [
						{ ...receipt, id: "exp_a", amount: 0 },
						{ ...receipt, id: "exp_b", amount: 24.9 },
					],
				}),
			],
			accounts,
		);

		expect(bookings).toHaveLength(1);
		expect(bookings[0]?.umsatz).toBe(24.9);
	});

	describe("Belegfeld 1", () => {
		it("numbers expenses by id so the same report always yields the same file", () => {
			// Expense has no createdAt, so a stable sort key is the only way to make
			// the numbering reproducible. Ids are given out of order here on purpose.
			const bookings = toBookings(
				[
					report({
						expenses: [
							{ ...receipt, id: "exp_c", description: "Dritte" },
							{ ...receipt, id: "exp_a", description: "Erste" },
							{ ...receipt, id: "exp_b", description: "Zweite" },
						],
					}),
				],
				accounts,
			);

			expect(bookings.map((b) => [b.belegfeld1, b.buchungstext])).toEqual([
				["42-1", "Sommerfest – 14.08.2026, Erste"],
				["42-2", "Sommerfest – 14.08.2026, Zweite"],
				["42-3", "Sommerfest – 14.08.2026, Dritte"],
			]);
		});

		it("orders ids by code point, independent of the host's locale", () => {
			// localeCompare would put these the other way round: collation folds case
			// at its primary level, and it is tailored per locale and per ICU build.
			// The numbering has to be the same file on every host, so the comparison
			// is over code points.
			const bookings = toBookings(
				[
					report({
						expenses: [
							{ ...receipt, id: "exp_a", description: "Klein" },
							{ ...receipt, id: "exp_B", description: "Gross" },
						],
					}),
				],
				accounts,
			);

			expect(bookings.map((b) => [b.belegfeld1, b.buchungstext])).toEqual([
				["42-1", "Sommerfest – 14.08.2026, Gross"],
				["42-2", "Sommerfest – 14.08.2026, Klein"],
			]);
		});

		it("orders reports by their number, whatever order they arrive in", () => {
			const bookings = toBookings(
				[
					report({ tag: 44, expenses: [receipt] }),
					report({ tag: 42, expenses: [receipt] }),
					report({ tag: 43, expenses: [receipt] }),
				],
				accounts,
			);

			expect(bookings.map((b) => b.belegfeld1)).toEqual(["42-1", "43-1", "44-1"]);
		});
	});
});
