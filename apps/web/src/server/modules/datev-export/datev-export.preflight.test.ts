import { describe, expect, it } from "vitest";
import {
	checkExportPreconditions,
	type DatevConfiguration,
	type PreflightReport,
} from "./datev-export.preflight";

const configured: DatevConfiguration = {
	beraternummer: 29098,
	mandantennummer: 55003,
	wirtschaftsjahrBeginn: new Date(Date.UTC(2026, 0, 1)),
	sachkontenlaenge: 4,
	kontenrahmen: "03",
	expenseAccountReceipt: "4980",
	expenseAccountTravel: "4670",
	expenseAccountFood: "4664",
	contraAccount: "1200",
};

const report: PreflightReport = {
	tag: 42,
	costUnitTag: "MARKETING",
	expenses: [{ amount: 24.9 }],
};

const period = {
	periodFrom: new Date(Date.UTC(2026, 7, 1)),
	periodTo: new Date(Date.UTC(2026, 7, 31)),
};

const check = (
	reports: PreflightReport[],
	configuration = configured,
	dates = period,
) => checkExportPreconditions({ configuration, reports, ...dates });

describe("checkExportPreconditions", () => {
	it("passes a fully configured organization", () => {
		expect(check([report])).toEqual({ blockers: [], notices: [] });
	});

	describe("configuration", () => {
		it("names every missing setting, not just the first", () => {
			// A message saying only "configuration incomplete" sends the admin hunting
			// through the settings page one field at a time.
			expect(
				check([report], {
					...configured,
					beraternummer: null,
					kontenrahmen: null,
					contraAccount: null,
				}).blockers,
			).toEqual([
				{
					kind: "missingConfiguration",
					fields: ["beraternummer", "kontenrahmen", "contraAccount"],
				},
			]);
		});

		it("counts a blank account as missing, not as configured", () => {
			// An empty string clears a null check and then books against no account
			// at all — the placeholder booking the preflight exists to prevent.
			expect(
				check([report], {
					...configured,
					expenseAccountTravel: "",
					contraAccount: "   ",
				}).blockers,
			).toEqual([
				{
					kind: "missingConfiguration",
					fields: ["expenseAccountTravel", "contraAccount"],
				},
			]);
		});

		it("counts a zero or unparseable number as missing", () => {
			// The header writes these with String(...), so a 0 from an untouched
			// form field and the NaN an empty numeric input parses to would reach
			// the Kanzlei as "0" and "NaN" and the file would be refused on import.
			expect(
				check([report], {
					...configured,
					beraternummer: 0,
					sachkontenlaenge: Number.NaN,
				}).blockers,
			).toEqual([
				{
					kind: "missingConfiguration",
					fields: ["beraternummer", "sachkontenlaenge"],
				},
			]);
		});

		it("counts an unparseable Wirtschaftsjahr as a missing setting", () => {
			// An Invalid Date is still a Date object and still clears a null check,
			// and its getTime() is NaN — which compares unequal to itself, so
			// letting it through would report the period as crossing a fiscal year
			// and send the admin looking at the dates they picked.
			const result = check([report], {
				...configured,
				wirtschaftsjahrBeginn: new Date("nonsense"),
			});

			expect(result.blockers).toEqual([
				{ kind: "missingConfiguration", fields: ["wirtschaftsjahrBeginn"] },
			]);
		});

		it("reports nothing else while the configuration is incomplete", () => {
			// Without accounts there is nothing to check the rest against, and a wall
			// of follow-on errors would bury the one thing to fix.
			const result = check([{ ...report, costUnitTag: "IT-Ops" }], {
				...configured,
				contraAccount: null,
			});

			expect(result.blockers).toHaveLength(1);
			expect(result.blockers[0]?.kind).toBe("missingConfiguration");
		});
	});

	describe("cost units", () => {
		it("blocks on a tag DATEV's KOST1 field cannot carry", () => {
			// KOST1 takes letters, digits, underscore and space — no hyphen, no
			// slash, no ampersand. These are exactly the tags organizations pick.
			expect(check([{ ...report, costUnitTag: "IT-Ops" }]).blockers).toEqual([
				{ kind: "costUnitNotExportable", costUnitTag: "IT-Ops", reportTags: [42] },
			]);
		});

		it("groups the reports that share an unusable tag", () => {
			const [problem] = check([
				{ ...report, tag: 42, costUnitTag: "F&E" },
				{ ...report, tag: 43, costUnitTag: "F&E" },
			]).blockers;

			expect(problem).toEqual({
				kind: "costUnitNotExportable",
				costUnitTag: "F&E",
				reportTags: [42, 43],
			});
		});

		it("does not rewrite the tag to something that would import", () => {
			// Silently turning IT-Ops into IT_Ops books against a cost centre that
			// does not exist in the Kanzlei's KOST program.
			const result = check([{ ...report, costUnitTag: "IT-Ops" }]);

			expect(JSON.stringify(result)).not.toContain("IT_Ops");
		});
	});

	describe("zero amounts", () => {
		it("notices a zero booking without blocking the export", () => {
			// DATEV rejects an Umsatz of 0,00, and a PAID report can never be edited
			// to fix it. Blocking would make that report permanently unexportable.
			const result = check([
				{
					...report,
					expenses: [{ amount: 0 }, { amount: 24.9 }],
				},
			]);

			expect(result.blockers).toEqual([]);
			expect(result.notices).toEqual([
				{ kind: "zeroAmountSkipped", reportTag: 42, count: 1 },
			]);
		});

		it("ignores the date of a zero booking, which is never written", () => {
			// The row is dropped from the file, so its Belegdatum cannot import under
			// the wrong year. Blocking on it would strand a PAID report for good.
			const result = check([
				{
					...report,
					expenses: [{ amount: 0 }, { amount: 24.9 }],
				},
			]);

			expect(result.blockers).toEqual([]);
		});
	});

	describe("reports that write nothing", () => {
		// The export marks these exported like any other, which is what keeps them
		// out of the next selection. Said out loud, or a report leaves the list
		// having never reached the Kanzlei.

		it("notices a report with no expenses at all", () => {
			const result = check([{ ...report, expenses: [] }]);

			expect(result.blockers).toEqual([]);
			expect(result.notices).toEqual([
				{ kind: "reportWithoutBookings", reportTag: 42 },
			]);
		});

		it("notices a report whose every expense is zero, alongside the count", () => {
			const result = check([
				{
					...report,
					expenses: [{ amount: 0 }, { amount: 0 }],
				},
			]);

			expect(result.blockers).toEqual([]);
			expect(result.notices).toEqual([
				{ kind: "zeroAmountSkipped", reportTag: 42, count: 2 },
				{ kind: "reportWithoutBookings", reportTag: 42 },
			]);
		});

		it("does not block on the cost unit of a report that writes no row", () => {
			// The tag never reaches KOST1, so refusing the whole file over it would
			// block every other report in the period for nothing — and a PAID report
			// cannot be edited into one that books.
			const result = check([
				{
					...report,
					costUnitTag: "IT-Ops",
					expenses: [{ amount: 0 }],
				},
			]);

			expect(result.blockers).toEqual([]);
		});

		it("still blocks a report that writes some rows", () => {
			// The counterpart: one bookable expense is enough for the tag to reach
			// the file, so the tag has to be fixed first.
			const result = check([
				{
					...report,
					costUnitTag: "IT-Ops",
					expenses: [{ amount: 0 }, { amount: 24.9 }],
				},
			]);

			expect(result.blockers).toEqual([
				{ kind: "costUnitNotExportable", costUnitTag: "IT-Ops", reportTags: [42] },
			]);
		});
	});

	describe("fiscal year", () => {
		// The Belegdatum in a Buchungsstapel is four digits, TTMM. The year comes
		// from the Wirtschaftsjahr in the header, so anything dated outside that
		// year silently imports under the wrong one.

		it("blocks a period that crosses the boundary", () => {
			expect(
				check([report], configured, {
					periodFrom: new Date(Date.UTC(2026, 11, 15)),
					periodTo: new Date(Date.UTC(2027, 0, 15)),
				}).blockers,
			).toEqual([
				{
					kind: "periodCrossesFiscalYear",
					fiscalYearStarts: [
						new Date(Date.UTC(2026, 0, 1)),
						new Date(Date.UTC(2027, 0, 1)),
					],
				},
			]);
		});

		it("follows a fiscal year that does not start in January", () => {
			const july = {
				...configured,
				wirtschaftsjahrBeginn: new Date(Date.UTC(2026, 6, 1)),
			};

			// Inside one July-to-June year.
			expect(
				check([report], july, {
					periodFrom: new Date(Date.UTC(2026, 7, 1)),
					periodTo: new Date(Date.UTC(2026, 7, 31)),
				}).blockers,
			).toEqual([]);

			// Straddling the July boundary.
			expect(
				check([report], july, {
					periodFrom: new Date(Date.UTC(2026, 5, 15)),
					periodTo: new Date(Date.UTC(2026, 6, 15)),
				}).blockers,
			).toHaveLength(1);
		});

		it("lets a report through whose receipt predates the exported year", () => {
			// Paid in August 2026, receipt from December 2025. This used to block,
			// because the Belegdatum was the receipt's date and its year came from
			// the header — "2012" would have imported as 20 December 2026.
			//
			// Every Belegdatum is now the report's paidAt, which the selection keeps
			// inside the period, so the receipt's own year cannot put a booking
			// outside the exported one. It is written out in full in the Buchungstext
			// instead, where the Steuerberater can see which period the cost is from.
			expect(
				check([
					{
						...report,
						expenses: [{ amount: 24.9 }, { amount: 10 }],
					},
				]).blockers,
			).toEqual([]);
		});
	});
});
