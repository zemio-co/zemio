import { describe, expect, it } from "vitest";
import { serializeHeader } from "./header";

/**
 * The expected value is DATEV's own sample header, taken verbatim from
 * `EXTF_Buchungsstapel.csv` in the official sample data:
 * https://developer.datev.de/assets/Musterdaten_DATEV_Format_0_7f9322b9cc.zip
 *
 * It is ground truth, not something this suite recomputes.
 */
const DATEV_SAMPLE_HEADER =
	'"EXTF";700;21;"Buchungsstapel";13;20240130140440439;;"RE";"";"";29098;55003;20240101;4;20240101;20240831;"Buchungsstapel";"WD";1;0;0;"EUR";;"";;;"03";;;"";""';

describe("serializeHeader", () => {
	it("reproduces DATEV's own sample header line", () => {
		const line = serializeHeader({
			erzeugtAm: new Date(Date.UTC(2024, 0, 30, 14, 4, 40, 439)),
			herkunft: "RE",
			exportiertVon: "",
			beraternummer: 29098,
			mandantennummer: 55003,
			wirtschaftsjahrBeginn: new Date(Date.UTC(2024, 0, 1)),
			sachkontenlaenge: 4,
			datumVon: new Date(Date.UTC(2024, 0, 1)),
			datumBis: new Date(Date.UTC(2024, 7, 31)),
			bezeichnung: "Buchungsstapel",
			diktatkuerzel: "WD",
			festschreibung: false,
			kontenrahmen: "03",
		});

		expect(line).toBe(DATEV_SAMPLE_HEADER);
	});
});

/**
 * Two of the header's fields are not the Kanzlei's to dictate: "Bezeichnung"
 * names the batch and "Exportiert von" names the person who pressed the
 * button. Both come out of the application, so both can carry anything.
 */
describe("serializeHeader, given values from the application", () => {
	const sample = {
		erzeugtAm: new Date(Date.UTC(2024, 0, 30, 14, 4, 40, 439)),
		herkunft: "RE",
		exportiertVon: "",
		beraternummer: 29098,
		mandantennummer: 55003,
		wirtschaftsjahrBeginn: new Date(Date.UTC(2024, 0, 1)),
		sachkontenlaenge: 4,
		datumVon: new Date(Date.UTC(2024, 0, 1)),
		datumBis: new Date(Date.UTC(2024, 7, 31)),
		bezeichnung: "Buchungsstapel",
		diktatkuerzel: "WD",
		festschreibung: false,
		kontenrahmen: "03",
	};

	const fields = (header: Partial<typeof sample>) =>
		serializeHeader({ ...sample, ...header }).split(";");

	it("still writes 31 fields when the batch name carries a separator", () => {
		expect(fields({ bezeichnung: 'Spesen "Q3"; Rest' })).toHaveLength(31);
	});

	it("escapes a quote in the batch name the way DATEV wants it", () => {
		expect(fields({ bezeichnung: 'Spesen "Q3"' })[16]).toBe('"Spesen ""Q3"""');
	});

	it("clamps a batch name to the 30 characters DATEV accepts", () => {
		// Unclamped, DATEV rejects the whole file over a field nobody reads.
		const bezeichnung = fields({ bezeichnung: "S".repeat(40) })[16];

		expect(bezeichnung).toBe(`"${"S".repeat(30)}"`);
	});

	it("clamps the exporting user to 25 characters", () => {
		expect(fields({ exportiertVon: "M".repeat(40) })[8]).toBe(
			`"${"M".repeat(25)}"`,
		);
	});
});
