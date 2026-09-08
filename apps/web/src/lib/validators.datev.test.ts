import { describe, expect, it } from "vitest";
import { updateDatevSettingsSchema } from "./validators";

const complete = {
	datevBeraternummer: 29098,
	datevMandantennummer: 55003,
	// The picker's own format; the schema parses it to UTC midnight.
	datevWirtschaftsjahrBeginn: "01.01.2026",
	datevSachkontenlaenge: 4,
	datevKontenrahmen: "03",
	datevExpenseAccountReceipt: "4980",
	datevExpenseAccountTravel: "4670",
	datevExpenseAccountFood: "4664",
	datevContraAccount: "1200",
	datevFestschreibung: true,
};

const accepts = (patch: Record<string, unknown>) =>
	updateDatevSettingsSchema.safeParse({ ...complete, ...patch }).success;

describe("updateDatevSettingsSchema", () => {
	it("accepts a fully configured Mandant", () => {
		expect(accepts({})).toBe(true);
	});

	it("reads the fiscal year start as the day it names, at UTC midnight", () => {
		const parsed = updateDatevSettingsSchema.parse(complete);

		expect(parsed.datevWirtschaftsjahrBeginn?.toISOString()).toBe(
			"2026-01-01T00:00:00.000Z",
		);
	});

	it("reads an empty fiscal year field as not configured", () => {
		// The form starts empty and has to be saveable that way, so "" is absence
		// rather than a broken date.
		const parsed = updateDatevSettingsSchema.parse({
			...complete,
			datevWirtschaftsjahrBeginn: "",
		});

		expect(parsed.datevWirtschaftsjahrBeginn).toBeNull();
	});

	it("lets every field be cleared again", () => {
		// The preflight treats an absent field as unconfigured and names it, so an
		// admin has to be able to save a half-filled form and come back to it after
		// asking the Kanzlei — rather than being unable to save anything until all
		// nine values are in hand.
		expect(
			accepts({
				datevBeraternummer: null,
				datevMandantennummer: null,
				datevWirtschaftsjahrBeginn: "",
				datevSachkontenlaenge: null,
				datevKontenrahmen: null,
				datevExpenseAccountReceipt: null,
				datevExpenseAccountTravel: null,
				datevExpenseAccountFood: null,
				datevContraAccount: null,
			}),
		).toBe(true);
	});

	describe("the numbers the Kanzlei dictates", () => {
		// Ranges from DATEV's header description: field 11 is 4–7 digits,
		// field 12 is 1–5, field 14 is a single digit 4–8. Checked here, at the one
		// place a value is typed — a file refused on import says nothing about
		// which of thirty-one header fields was wrong.
		it("holds the Beraternummer to DATEV's range", () => {
			expect(accepts({ datevBeraternummer: 1001 })).toBe(true);
			expect(accepts({ datevBeraternummer: 9999999 })).toBe(true);
			expect(accepts({ datevBeraternummer: 1000 })).toBe(false);
			expect(accepts({ datevBeraternummer: 10000000 })).toBe(false);
			expect(accepts({ datevBeraternummer: 0 })).toBe(false);
		});

		it("holds the Mandantennummer to DATEV's range", () => {
			expect(accepts({ datevMandantennummer: 1 })).toBe(true);
			expect(accepts({ datevMandantennummer: 99999 })).toBe(true);
			expect(accepts({ datevMandantennummer: 0 })).toBe(false);
			expect(accepts({ datevMandantennummer: 100000 })).toBe(false);
		});

		it("holds the Sachkontenlänge to a single digit between 4 and 8", () => {
			expect(accepts({ datevSachkontenlaenge: 4 })).toBe(true);
			expect(accepts({ datevSachkontenlaenge: 8 })).toBe(true);
			expect(accepts({ datevSachkontenlaenge: 3 })).toBe(false);
			expect(accepts({ datevSachkontenlaenge: 9 })).toBe(false);
		});

		it("refuses a number that is not whole", () => {
			expect(accepts({ datevMandantennummer: 55003.5 })).toBe(false);
		});
	});

	describe("the Kontenrahmen", () => {
		it("takes the two DATEV writes into header field 27", () => {
			expect(accepts({ datevKontenrahmen: "03" })).toBe(true);
			expect(accepts({ datevKontenrahmen: "04" })).toBe(true);
		});

		it("refuses anything else, including the ones a Verein would want", () => {
			// SKR49 exists, but nothing downstream maps to it: the accounts are the
			// KMU ones. Accepting it here would promise support that is not there.
			expect(accepts({ datevKontenrahmen: "49" })).toBe(false);
			expect(accepts({ datevKontenrahmen: "3" })).toBe(false);
			expect(accepts({ datevKontenrahmen: "SKR03" })).toBe(false);
		});
	});

	describe("the account numbers", () => {
		it("takes a plain ledger account number", () => {
			expect(accepts({ datevContraAccount: "1200" })).toBe(true);
			expect(accepts({ datevContraAccount: "123456789" })).toBe(true);
		});

		it("refuses anything that is not digits", () => {
			// DATEV's Konto field is numeric. A stray space or letter would be
			// written into the file and refused on import.
			expect(accepts({ datevContraAccount: "12 00" })).toBe(false);
			expect(accepts({ datevContraAccount: "1200a" })).toBe(false);
			expect(accepts({ datevContraAccount: "" })).toBe(false);
		});

		it("refuses more than the nine digits DATEV allows", () => {
			expect(accepts({ datevContraAccount: "1234567890" })).toBe(false);
		});
	});
});
