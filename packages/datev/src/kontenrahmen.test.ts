import { describe, expect, it } from "vitest";
import { toKontenrahmen } from "./kontenrahmen";

describe("toKontenrahmen", () => {
	it("takes the two values DATEV writes into header field 27", () => {
		expect(toKontenrahmen("03")).toBe("03");
		expect(toKontenrahmen("04")).toBe("04");
	});

	it("reads anything else as unconfigured", () => {
		// Including SKR49, which exists for Vereine but has no account mapping
		// behind it here. Reading it as absent is what lets the preflight name the
		// field, instead of the serializer writing a value DATEV refuses the whole
		// file over — with no indication which of thirty-one header fields it was.
		expect(toKontenrahmen("49")).toBeNull();
		expect(toKontenrahmen("3")).toBeNull();
		expect(toKontenrahmen("SKR03")).toBeNull();
		expect(toKontenrahmen(" 03")).toBeNull();
	});

	it("reads an absent value as unconfigured", () => {
		expect(toKontenrahmen(null)).toBeNull();
		expect(toKontenrahmen(undefined)).toBeNull();
		expect(toKontenrahmen("")).toBeNull();
	});
});
