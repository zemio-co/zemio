import { describe, expect, it } from "vitest";
import { isValidBelegfeld1, isValidKostenstelle } from "./validate";

/**
 * The two character sets are almost inverted, which is the trap this suite
 * exists to pin down. From DATEV's field descriptions:
 *
 *   Belegfeld 1  ^(["][\w$&%*+\-\/]{0,36}["])$
 *   KOST1        ^(["][\w ]{0,36}["])$
 *
 * with `\w` defined by DATEV as [a-zA-Z0-9_]. Belegfeld 1 takes a hyphen but no
 * space; KOST1 takes a space but no hyphen. Both forbid umlauts, and DATEV names
 * "Leerzeichen, Umlaute, Punkt, Komma, Semikolon und Doppelpunkt" explicitly.
 */
describe("isValidBelegfeld1", () => {
	it("accepts the report-and-position number the export writes", () => {
		expect(isValidBelegfeld1("42-3")).toBe(true);
		expect(isValidBelegfeld1("1234-17")).toBe(true);
	});

	it("accepts DATEV's own example", () => {
		expect(isValidBelegfeld1("Rg32029/2024")).toBe(true);
	});

	it("rejects a space", () => {
		expect(isValidBelegfeld1("42 3")).toBe(false);
	});

	it("rejects umlauts and punctuation", () => {
		expect(isValidBelegfeld1("Büro")).toBe(false);
		expect(isValidBelegfeld1("42.3")).toBe(false);
		expect(isValidBelegfeld1("42,3")).toBe(false);
		expect(isValidBelegfeld1("42;3")).toBe(false);
		expect(isValidBelegfeld1("42:3")).toBe(false);
	});

	it("accepts every character DATEV lists, and no other separator", () => {
		// The half of the trap that is easy to get wrong in the other direction:
		// these all belong in Belegfeld 1 and none of them in KOST1.
		for (const character of "$&%*+-/") {
			expect(isValidBelegfeld1(`42${character}3`)).toBe(true);
			expect(isValidKostenstelle(`42${character}3`)).toBe(false);
		}

		expect(isValidBelegfeld1("42\\3")).toBe(false);
		expect(isValidBelegfeld1("42#3")).toBe(false);
	});

	it("rejects more than 36 characters", () => {
		expect(isValidBelegfeld1("a".repeat(36))).toBe(true);
		expect(isValidBelegfeld1("a".repeat(37))).toBe(false);
	});

	it("rejects an empty value", () => {
		// DATEV's own `{0,36}` would take it. Here an empty Belegfeld 1 means the
		// export failed to compose the report number, which is worth reporting
		// rather than writing.
		expect(isValidBelegfeld1("")).toBe(false);
	});
});

describe("isValidKostenstelle", () => {
	it("accepts letters, digits, underscore and space", () => {
		expect(isValidKostenstelle("MARKETING")).toBe(true);
		expect(isValidKostenstelle("IT_Ops")).toBe(true);
		expect(isValidKostenstelle("IT Ops")).toBe(true);
		expect(isValidKostenstelle("100")).toBe(true);
	});

	it("rejects the separators a cost unit tag is likely to carry", () => {
		// These are exactly the tags an organization tends to have already.
		expect(isValidKostenstelle("IT-Ops")).toBe(false);
		expect(isValidKostenstelle("Reise/DE")).toBe(false);
		expect(isValidKostenstelle("F&E")).toBe(false);
	});

	it("rejects umlauts, however they are composed", () => {
		expect(isValidKostenstelle("Büro")).toBe(false);
		// The same word with a combining diaeresis (U+0075 U+0308), whose `u` on
		// its own is a character the class accepts. It renders identically to the
		// precomposed line above and is a different string.
		expect(isValidKostenstelle("Büro")).toBe(false);
	});

	it("rejects a control character rather than letting it become a space", () => {
		// The serializer folds control characters inside a quoted field into a
		// space, so an unrejected `IT\nOps` would reach DATEV as `IT Ops` — a
		// valid tag, for a different cost centre. `$` without the `m` flag is the
		// end of the input, not the end of a line, so a trailing break is rejected
		// rather than accepted as the part before it.
		expect(isValidKostenstelle("IT\nOps")).toBe(false);
		expect(isValidKostenstelle("IT\tOps")).toBe(false);
		expect(isValidKostenstelle("IT")).toBe(true);
		expect(isValidKostenstelle("IT\n")).toBe(false);
		expect(isValidKostenstelle("IT\r\n")).toBe(false);
	});

	it("rejects an empty tag and more than 36 characters", () => {
		expect(isValidKostenstelle("")).toBe(false);
		expect(isValidKostenstelle("a".repeat(36))).toBe(true);
		expect(isValidKostenstelle("a".repeat(37))).toBe(false);
	});

	it("cannot be talked past the 36-character limit with multi-byte input", () => {
		// The limit counts UTF-16 units, but only ASCII gets through the class, so
		// a character that occupies two of them cannot buy room inside the count —
		// it is refused outright.
		expect(isValidKostenstelle(`${"a".repeat(36)}\u{1F600}`)).toBe(false);
		expect(isValidKostenstelle("\u{1F600}".repeat(36))).toBe(false);
		// A no-break space and fullwidth digits read as a space and digits, and
		// are neither. They are written literally, so beware when reading this:
		// the first is U+00A0, not the plain space the first test accepts, and
		// the second is U+FF14 U+FF12, not "42".
		expect(isValidKostenstelle("IT Ops")).toBe(false);
		expect(isValidKostenstelle("４２")).toBe(false);
	});
});
