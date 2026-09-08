import { describe, expect, it } from "vitest";
import { fiscalYearStartFor } from "./fiscal-year";

/**
 * The Belegdatum in a Buchungsstapel is four digits, TTMM; its year comes from
 * the Wirtschaftsjahr in the header. The setting stores the month and day a
 * fiscal year starts on plus whichever year it happened to be entered in, so
 * the year has to be derived from the period rather than read off the setting.
 */
describe("fiscalYearStartFor", () => {
	const january = new Date(Date.UTC(2020, 0, 1));

	it("takes the year from the date, not from the stored setting", () => {
		expect(fiscalYearStartFor(new Date(Date.UTC(2026, 7, 5)), january)).toEqual(
			new Date(Date.UTC(2026, 0, 1)),
		);
	});

	it("follows a fiscal year that does not start in January", () => {
		const july = new Date(Date.UTC(2020, 6, 1));

		// August 2026 falls in the year that opened in July 2026.
		expect(fiscalYearStartFor(new Date(Date.UTC(2026, 7, 5)), july)).toEqual(
			new Date(Date.UTC(2026, 6, 1)),
		);

		// June 2026 still belongs to the year that opened in July 2025.
		expect(fiscalYearStartFor(new Date(Date.UTC(2026, 5, 30)), july)).toEqual(
			new Date(Date.UTC(2025, 6, 1)),
		);
	});

	it("counts the first day of a fiscal year as inside it", () => {
		expect(fiscalYearStartFor(new Date(Date.UTC(2026, 0, 1)), january)).toEqual(
			new Date(Date.UTC(2026, 0, 1)),
		);
	});
});
