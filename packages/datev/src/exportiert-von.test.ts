import { describe, expect, it } from "vitest";
import { toExportiertVon } from "./exportiert-von";

describe("toExportiertVon", () => {
	it("writes German umlauts out rather than dropping their marks", () => {
		// A Kanzlei reading "JurgenMuller" reads a typo. NFKD alone gives exactly
		// that: it splits `ü` into `u` plus a combining diaeresis, and the mark is
		// then removed by the charset filter.
		expect(toExportiertVon("Jürgen Müller")).toBe("JuergenMueller");
	});

	it("writes ß out and drops a hyphen", () => {
		// Field 9 takes neither, and there is no character it could map them to:
		// `^["]\w{0,25}["]$` with DATEV's `\w` being `[A-Za-z0-9_]`.
		expect(toExportiertVon("Anna-Lena Weiß")).toBe("AnnaLenaWeiss");
	});

	it("folds an accent to its base letter", () => {
		expect(toExportiertVon("Zoé Français")).toBe("ZoeFrancais");
	});

	it("truncates at 25 characters", () => {
		// The format ceiling. Counted after folding, because that is what grows a
		// value: "Weiß" is four characters and five once written out.
		expect(toExportiertVon("Maximiliane Schäfer-Lindemann")).toBe(
			"MaximilianeSchaeferLindem",
		);
	});

	it("gives up on a name with nothing writable in it", () => {
		// An empty field 9 is valid — `{0,25}` — and says nothing, which is
		// honest. A transliteration nobody at the organization would recognize
		// would be worse than saying nothing.
		expect(toExportiertVon("李明")).toBe("");
	});

	it("gives up on an empty name", () => {
		expect(toExportiertVon("")).toBe("");
	});
});
