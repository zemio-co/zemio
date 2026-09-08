import { describe, expect, it } from "vitest";
import { buchungsstapelFilename } from "./filename";

describe("buchungsstapelFilename", () => {
	it("names the month a whole month covers", () => {
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 7, 1)),
				new Date(Date.UTC(2026, 7, 31)),
			),
		).toBe("EXTF_Buchungsstapel_202608.csv");
	});

	it("recognizes a whole month of any length", () => {
		// The last day is read off the month rather than assumed to be the 31st.
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 1, 1)),
				new Date(Date.UTC(2026, 1, 28)),
			),
		).toBe("EXTF_Buchungsstapel_202602.csv");
	});

	it("names the days of a period that is not a whole month", () => {
		// Naming half of August "202608" reads as the August stapel in the
		// Kanzlei's folder, and August is not done.
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 7, 1)),
				new Date(Date.UTC(2026, 7, 15)),
			),
		).toBe("EXTF_Buchungsstapel_20260801-20260815.csv");
	});

	it("gives two parts of one month two different names", () => {
		// Both files end up in the same download folder, so one name for both
		// means the second overwrites the first or lands beside it as a
		// browser-numbered copy.
		const first = buchungsstapelFilename(
			new Date(Date.UTC(2026, 7, 1)),
			new Date(Date.UTC(2026, 7, 15)),
		);
		const second = buchungsstapelFilename(
			new Date(Date.UTC(2026, 7, 16)),
			new Date(Date.UTC(2026, 7, 31)),
		);

		expect(first).not.toBe(second);
	});

	it("names both ends of a period spanning several months", () => {
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 0, 1)),
				new Date(Date.UTC(2026, 2, 31)),
			),
		).toBe("EXTF_Buchungsstapel_20260101-20260331.csv");
	});

	it("names a single day once", () => {
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 6, 31)),
				new Date(Date.UTC(2026, 6, 31)),
			),
		).toBe("EXTF_Buchungsstapel_20260731.csv");
	});

	it("reads the dates in UTC, like every other date on the export path", () => {
		// 23:00 on 31 July is still July here, whatever the server's timezone —
		// a local read east of UTC would name this an August file.
		expect(
			buchungsstapelFilename(
				new Date(Date.UTC(2026, 6, 31, 23, 0, 0)),
				new Date(Date.UTC(2026, 6, 31, 23, 0, 0)),
			),
		).toBe("EXTF_Buchungsstapel_20260731.csv");
	});
});
