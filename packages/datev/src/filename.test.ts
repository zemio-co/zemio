import { describe, expect, it } from "vitest";
import { buchungsstapelFilename } from "./filename";

describe("buchungsstapelFilename", () => {
	it("names the month a single-month period covers", () => {
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 7, 1)),
				new Date(Date.UTC(2026, 7, 31)),
			),
		).toBe("EXTF_Buchungsstapel_202608.csv");
	});

	it("names both months where they differ", () => {
		// A quarter labelled by its first month alone reads as a January stapel in
		// the Kanzlei's folder.
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 0, 1)),
				new Date(Date.UTC(2026, 2, 31)),
			),
		).toBe("EXTF_Buchungsstapel_202601-202603.csv");
	});

	it("reads the months in UTC, like every other date on the export path", () => {
		// 23:00 on 31 July is still July here, whatever the server's timezone.
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 6, 31, 23, 0, 0)),
				new Date(Date.UTC(2026, 6, 31, 23, 0, 0)),
			),
		).toBe("EXTF_Buchungsstapel_202607.csv");
	});
});
