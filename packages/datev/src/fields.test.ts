import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COLUMNS, MAX_LENGTH, QUOTED } from "./fields";

/**
 * Ground truth is the column-heading row of DATEV's own sample file,
 * `EXTF_Buchungsstapel.csv` from the official sample data, kept verbatim in
 * `__fixtures__/datev-columns.csv`. Getting a column's position wrong silently
 * files an amount under someone else's field, so the order is asserted against
 * DATEV rather than against our own list.
 */
const datevColumns = readFileSync(
	fileURLToPath(new URL("./__fixtures__/datev-columns.csv", import.meta.url)),
	"utf8",
)
	.replace(/\r?\n$/, "")
	.split(";");

describe("COLUMNS", () => {
	it("matches DATEV's own column headings, in DATEV's order", () => {
		expect(COLUMNS).toEqual(datevColumns);
	});

	// serializeRow indexes all three by column position. A short QUOTED or
	// MAX_LENGTH reads back as undefined rather than failing, which writes the
	// tail of every row unquoted and untruncated — so the three are pinned to
	// each other here, where regenerating the file has to keep them in step.
	it("carries a quoting and a length for every column", () => {
		expect(QUOTED).toHaveLength(COLUMNS.length);
		expect(MAX_LENGTH).toHaveLength(COLUMNS.length);
	});
});
