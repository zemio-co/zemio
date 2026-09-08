import { describe, expect, it } from "vitest";
import { COLUMNS } from "./fields";
import { serializeRow } from "./row";

/**
 * Reads one field out of a serialized row by DATEV's own column name, so a test
 * says which field it means instead of counting semicolons. `COLUMNS` is itself
 * asserted against DATEV's sample file in `fields.test.ts`.
 */
function field(row: string, column: (typeof COLUMNS)[number]): string {
	return row.split(";")[COLUMNS.indexOf(column)] as string;
}

/**
 * Quoting and number formatting below follow DATEV's own sample row:
 *   100,18;"S";"";;;"";48400;8401;"";3101;"";"";;"Test Anzahlung";…
 * Amounts use a comma, Konto and Belegdatum are bare, text fields are quoted.
 */
const receiptBooking = {
	umsatz: 100.18,
	sollHaben: "S" as const,
	konto: "4980",
	gegenkonto: "1200",
	buSchluessel: "9",
	belegdatum: new Date(Date.UTC(2026, 0, 31)),
	belegfeld1: "42-3",
	buchungstext: "Dienstreise Münster – Taxi",
	kostenstelle: "MARKETING",
};

describe("serializeRow", () => {
	it("writes every one of DATEV's 125 positions", () => {
		expect(serializeRow(receiptBooking).split(";")).toHaveLength(125);
	});

	it("places a receipt booking with input tax in DATEV's fields", () => {
		const row = serializeRow(receiptBooking);

		expect(field(row, "Umsatz (ohne Soll/Haben-Kz)")).toBe("100,18");
		expect(field(row, "Soll/Haben-Kennzeichen")).toBe('"S"');
		expect(field(row, "Konto")).toBe("4980");
		expect(field(row, "Gegenkonto (ohne BU-Schlüssel)")).toBe("1200");
		expect(field(row, "BU-Schlüssel")).toBe('"9"');
		expect(field(row, "Belegdatum")).toBe("3101");
		expect(field(row, "Belegfeld 1")).toBe('"42-3"');
		expect(field(row, "Buchungstext")).toBe('"Dienstreise Münster – Taxi"');
		expect(field(row, "KOST1 - Kostenstelle")).toBe('"MARKETING"');
	});

	it("leaves the BU-Schlüssel empty when no input tax is claimed", () => {
		const row = serializeRow({ ...receiptBooking, buSchluessel: undefined });

		expect(field(row, "BU-Schlüssel")).toBe('""');
	});

	it("writes the Belegdatum as day and month only, never the year", () => {
		// The year comes from the Wirtschaftsjahr in the header, which is why a
		// file cannot span two fiscal years.
		const row = serializeRow({
			...receiptBooking,
			belegdatum: new Date(Date.UTC(2026, 8, 5)),
		});

		expect(field(row, "Belegdatum")).toBe("0509");
	});

	describe("escaping", () => {
		// Every text field carries user input: report titles, expense descriptions,
		// city names, cost unit tags. An unescaped quote or line break does not
		// mangle one field, it shifts every field after it.
		it("doubles a quote inside a text field", () => {
			const row = serializeRow({
				...receiptBooking,
				buchungstext: 'Konferenz "Nord" – Taxi',
			});

			expect(field(row, "Buchungstext")).toBe('"Konferenz ""Nord"" – Taxi"');
		});

		it("keeps the field count when text carries quotes and semicolons", () => {
			const row = serializeRow({
				...receiptBooking,
				buchungstext: 'Titel "A";"B"',
			});

			// Counted with the quoted runs removed, so a semicolon inside a field
			// cannot be mistaken for a separator: 125 fields, 124 separators.
			expect(row.replace(/"(?:[^"]|"")*"/g, "").split(";")).toHaveLength(125);
		});

		it("folds a line break to a space rather than ending the record", () => {
			const row = serializeRow({
				...receiptBooking,
				buchungstext: "Erste Zeile\r\nZweite Zeile",
			});

			expect(row).not.toContain("\n");
			expect(field(row, "Buchungstext")).toBe('"Erste Zeile Zweite Zeile"');
		});

		// DATEV's pattern for Buchungstext permits a semicolon inside the quotes,
		// but the KrStaPv console import splits on semicolons without honouring
		// them. Folding it costs a punctuation mark; keeping it can file an amount
		// under the wrong column.
		it("keeps a semicolon out of a text field entirely", () => {
			const row = serializeRow({
				...receiptBooking,
				buchungstext: "Sommerfest; Team Nord",
			});

			expect(field(row, "Buchungstext")).toBe('"Sommerfest Team Nord"');
			expect(row.split(";")).toHaveLength(125);
		});

		it("writes 125 fields whatever a text field holds", () => {
			const row = serializeRow({
				...receiptBooking,
				buchungstext: 'a";\r\nb;"c',
				kostenstelle: 'x";y',
			});

			expect(row.split(";")).toHaveLength(125);
		});

		it("refuses a Konto that would break the record, having nowhere to put it", () => {
			// Konto is one of the fields DATEV leaves unquoted, so unlike a text
			// field it cannot carry a separator at all. It arrives from the
			// organisation's settings, where nothing has checked its shape.
			expect(() => serializeRow({ ...receiptBooking, konto: "49;80" })).toThrow(
				/Konto/,
			);
		});
	});

	/**
	 * DATEV's pattern for field 1 is `^(?!0{1,10}\,00)\d{1,10}\,\d{2}$`:
	 * positive, never zero, at most ten digits before the comma.
	 */
	describe("the amount", () => {
		const withUmsatz = (umsatz: number) =>
			serializeRow({ ...receiptBooking, umsatz });

		it("writes the largest amount DATEV takes in full", () => {
			// Thirteen characters, in a field DATEV's format definition calls
			// Length 10 — that ten counts the digits before the comma, not the
			// characters, so the field must not be cut to it.
			expect(
				field(withUmsatz(9_999_999_999.99), "Umsatz (ohne Soll/Haben-Kz)"),
			).toBe("9999999999,99");
		});

		it.each([
			["a digit too long", 10_000_000_000],
			["negative", -42.5],
			["zero", 0],
			["not a number", Number.NaN],
			["infinite", Number.POSITIVE_INFINITY],
		])("refuses an amount that is %s rather than writing a wrong number", (_label, umsatz) => {
			expect(() => withUmsatz(umsatz)).toThrow(RangeError);
		});
	});
});
