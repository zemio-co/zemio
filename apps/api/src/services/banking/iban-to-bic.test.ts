import { describe, expect, it } from "bun:test";
import { getBicForIban } from "./iban-to-bic";

describe("getBicForIban", () => {
	it("resolves the BIC for a known German bank code", () => {
		expect(getBicForIban("DE00500700100000000000")).toBe("DEUTDEFFXXX");
		expect(getBicForIban("DE00370501980000000000")).toBe("COLSDE33XXX");
	});

	it("is whitespace-insensitive and case-insensitive", () => {
		expect(getBicForIban("de00 5007 0010 0000 0000 00")).toBe("DEUTDEFFXXX");
	});

	it("returns undefined for a bank code not in the dataset", () => {
		expect(getBicForIban("DE00999999990000000000")).toBeUndefined();
	});

	it("returns undefined for a country without a registered dataset", () => {
		expect(getBicForIban("GB82WEST12345698765432")).toBeUndefined();
	});
});
