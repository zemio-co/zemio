import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "./calendar-date";

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

	it("refuses anything that is not a German date", () => {
		expect(parseCalendarDate("")).toBeNull();
		expect(parseCalendarDate("2026-03-01")).toBeNull();
		expect(parseCalendarDate("01.03.26")).toBeNull();
		expect(parseCalendarDate("Montag")).toBeNull();
	});
});
