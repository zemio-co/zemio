import { describe, expect, it } from "vitest";
import { formatCalendarDate, parseCalendarDate } from "./calendar-date";

describe("parseCalendarDate", () => {
	it("reads a German date as that day at UTC midnight", () => {
		expect(parseCalendarDate("01.03.2026")?.toISOString()).toBe(
			"2026-03-01T00:00:00.000Z",
		);
	});

	it("keeps the typed day whatever the server's timezone is", () => {
		// The whole point. `parse` from date-fns returns local midnight, which on a
		// host east of UTC is the previous day once read back with getUTC* — and the
		// DATEV export reads these dates that way. Set TZ before the process starts
		// to see the old behaviour; here we assert the property that must hold
		// regardless: the UTC calendar day equals the typed one.
		const date = parseCalendarDate("01.01.2026");

		expect(date?.getUTCFullYear()).toBe(2026);
		expect(date?.getUTCMonth()).toBe(0);
		expect(date?.getUTCDate()).toBe(1);
		expect(date?.getUTCHours()).toBe(0);
	});

	it("carries no time of day at all", () => {
		const date = parseCalendarDate("29.02.2024");

		expect(date?.getUTCHours()).toBe(0);
		expect(date?.getUTCMinutes()).toBe(0);
		expect(date?.getUTCSeconds()).toBe(0);
		expect(date?.getUTCMilliseconds()).toBe(0);
	});

	it("accepts a leap day that exists", () => {
		expect(parseCalendarDate("29.02.2024")?.toISOString()).toBe(
			"2024-02-29T00:00:00.000Z",
		);
	});

	it("refuses a day that does not exist", () => {
		// date-fns rolls 31.02. over to 2 March rather than failing, so the parsed
		// day is checked back against what was typed.
		expect(parseCalendarDate("31.02.2026")).toBeNull();
		expect(parseCalendarDate("29.02.2026")).toBeNull();
		expect(parseCalendarDate("32.01.2026")).toBeNull();
	});

	it("applies the Gregorian century rule to leap days", () => {
		expect(parseCalendarDate("29.02.1900")).toBeNull();
		expect(parseCalendarDate("29.02.2000")?.toISOString()).toBe(
			"2000-02-29T00:00:00.000Z",
		);
	});

	it("refuses anything that is not a German date", () => {
		expect(parseCalendarDate("")).toBeNull();
		expect(parseCalendarDate("2026-03-01")).toBeNull();
		expect(parseCalendarDate("01.03.26")).toBeNull();
		expect(parseCalendarDate("Montag")).toBeNull();
	});

	it("refuses a date wrapped in whitespace rather than trimming it", () => {
		// The regex is anchored and JS `$` does not forgive a trailing newline the
		// way Python's does, so nothing here needs a trim — but a later "let's be
		// lenient" trim would change what reaches the database, so pin it.
		expect(parseCalendarDate(" 01.03.2026")).toBeNull();
		expect(parseCalendarDate("01.03.2026 ")).toBeNull();
		expect(parseCalendarDate("01.03.2026\n")).toBeNull();
	});

	it("refuses signed and padded components", () => {
		expect(parseCalendarDate("+1.3.2026")).toBeNull();
		expect(parseCalendarDate("-1.3.2026")).toBeNull();
		expect(parseCalendarDate("001.03.2026")).toBeNull();
		expect(parseCalendarDate("01.03.02026")).toBeNull();
	});

	it("only reads ASCII digits", () => {
		// `\d` is `[0-9]` in JS, so Arabic-Indic and fullwidth digits never match
		// and never reach `Number`. Adding the `u` flag with `\p{Nd}` would let
		// them through and hand `Number` something it parses as NaN.
		expect(parseCalendarDate("٠١.٠٣.٢٠٢٦")).toBeNull();
		expect(parseCalendarDate("０１.０３.２０２６")).toBeNull();
	});

	it("refuses a year below 100 instead of shifting it into the 20th century", () => {
		// `Date.UTC(26, 2, 1)` is 1926, not the year 26: the component check is
		// what turns that into a rejection.
		expect(parseCalendarDate("01.03.0026")).toBeNull();
		expect(parseCalendarDate("01.03.0000")).toBeNull();
	});

	it("refuses a zero day or month", () => {
		expect(parseCalendarDate("00.03.2026")).toBeNull();
		expect(parseCalendarDate("01.00.2026")).toBeNull();
		expect(parseCalendarDate("01.13.2026")).toBeNull();
	});
});

describe("formatCalendarDate", () => {
	it("renders the day the value names, padded", () => {
		expect(formatCalendarDate(new Date("2026-03-01T00:00:00.000Z"))).toBe(
			"01.03.2026",
		);
	});

	it("round-trips with parseCalendarDate", () => {
		// The property that matters for the edit form: what it shows is what
		// parsing it back gives, so re-saving an untouched field is a no-op. A
		// local formatter breaks this west of UTC, which is how a date walks.
		for (const typed of ["01.03.2026", "29.02.2024", "31.12.2026"]) {
			const parsed = parseCalendarDate(typed);

			expect(parsed).not.toBeNull();
			expect(formatCalendarDate(parsed as Date)).toBe(
				typed.replace(/^(\d)\./, "0$1."),
			);
			expect(parseCalendarDate(formatCalendarDate(parsed as Date))).toEqual(
				parsed,
			);
		}
	});
});
