import { describe, expect, it } from "bun:test";
import { isValidIban } from "./validate-iban";

describe("isValidIban", () => {
	it("accepts a valid IBAN from the ISO 7064 worked example", () => {
		expect(isValidIban("GB82 WEST 1234 5698 7654 32")).toBe(true);
	});

	it("accepts valid IBANs across several countries and lengths", () => {
		expect(isValidIban("DE89370400440532013000")).toBe(true);
		expect(isValidIban("FR1420041010050500013M02606")).toBe(true);
		expect(isValidIban("NL91ABNA0417164300")).toBe(true);
		expect(isValidIban("BE68539007547034")).toBe(true);
		expect(isValidIban("CH9300762011623852957")).toBe(true);
	});

	it("is whitespace-insensitive and case-insensitive", () => {
		expect(isValidIban("de89 3704 0044 0532 0130 00")).toBe(true);
		expect(isValidIban("DE89370400440532013000")).toBe(true);
	});

	it("rejects an IBAN with a corrupted check digit", () => {
		expect(isValidIban("GB82WEST12345698765433")).toBe(false);
	});

	it("rejects an IBAN with a corrupted body", () => {
		expect(isValidIban("DE89370400440532013001")).toBe(false);
	});

	it("rejects an IBAN with the wrong length for its country", () => {
		expect(isValidIban("DE8937040044053201300")).toBe(false); // one char short
		expect(isValidIban("DE893704004405320130000")).toBe(false); // one char long
	});

	it("rejects an unknown country code", () => {
		expect(isValidIban("ZZ89370400440532013000")).toBe(false);
	});

	it("rejects malformed input", () => {
		expect(isValidIban("")).toBe(false);
		expect(isValidIban("NOTANIBAN")).toBe(false);
		expect(isValidIban("12DE370400440532013000")).toBe(false); // digits where letters required
		expect(isValidIban("DE-9370400440532013000")).toBe(false); // invalid character
	});
});
