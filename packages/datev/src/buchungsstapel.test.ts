import iconv from "iconv-lite";
import { describe, expect, it } from "vitest";
import { serializeBuchungsstapel } from "./buchungsstapel";

const header = {
	erzeugtAm: new Date(Date.UTC(2026, 8, 5, 9, 0, 0, 0)),
	herkunft: "ZE",
	exportiertVon: "",
	beraternummer: 29098,
	mandantennummer: 55003,
	wirtschaftsjahrBeginn: new Date(Date.UTC(2026, 0, 1)),
	sachkontenlaenge: 4,
	datumVon: new Date(Date.UTC(2026, 7, 1)),
	datumBis: new Date(Date.UTC(2026, 7, 31)),
	bezeichnung: "Spesen 08/2026",
	diktatkuerzel: "",
	festschreibung: true,
	kontenrahmen: "03",
};

const booking = {
	umsatz: 42.5,
	sollHaben: "S" as const,
	konto: "4980",
	gegenkonto: "1200",
	buSchluessel: "9",
	belegdatum: new Date(Date.UTC(2026, 7, 14)),
	belegfeld1: "42-3",
	buchungstext: "Büromaterial",
	kostenstelle: "IT",
};

/**
 * Read back as CP1252, not as latin1. The two agree below 0x80 and differ over
 * 0x80-0x9F, which is exactly where the characters German expense text reaches
 * for live: the euro sign and the en dash among them.
 */
const decode = (file: Buffer) => iconv.decode(file, "win1252");

describe("serializeBuchungsstapel", () => {
	it("lays the file out as DATEV does: header, column names, then bookings", () => {
		// DATEV's own sample file has the same three-part shape, with the 125
		// column names on line 2 and one booking per line from line 3.
		const lines = decode(serializeBuchungsstapel(header, [booking, booking]))
			.split("\r\n")
			.filter((line) => line !== "");

		expect(lines).toHaveLength(4);
		expect(lines[0]?.split(";")).toHaveLength(31);
		expect(lines[1]?.startsWith("Umsatz (ohne Soll/Haben-Kz);")).toBe(true);
		expect(lines[2]?.split(";")).toHaveLength(125);
	});

	it("ends every line with CRLF", () => {
		const text = decode(serializeBuchungsstapel(header, [booking]));

		expect(text.endsWith("\r\n")).toBe(true);
		expect(text.replace(/\r\n/g, "")).not.toContain("\n");
	});

	it("encodes as CP1252 so the file imports through every DATEV channel", () => {
		// UTF-8 only works via manual import or the online API; KrStaPv cannot
		// read it. CP1252 is the one encoding that works on all three.
		const file = serializeBuchungsstapel(header, [booking]);

		// "ü" is a single 0xFC byte in CP1252, two bytes (0xC3 0xBC) in UTF-8.
		expect(file.includes(Buffer.from([0xfc]))).toBe(true);
		expect(file.includes(Buffer.from([0xc3, 0xbc]))).toBe(false);
	});

	it("replaces characters CP1252 cannot represent rather than failing", () => {
		const file = serializeBuchungsstapel(header, [
			{ ...booking, buchungstext: "Kaffee ☕ für das Team" },
		]);

		// The umlaut survives; the emoji is replaced, and nothing throws.
		expect(decode(file)).toContain("für das Team");
	});

	it("carries the euro sign and the en dash CP1252 does have", () => {
		// Both live in 0x80-0x9F, the range a latin1 reader would lose.
		const file = serializeBuchungsstapel(header, [
			{ ...booking, buchungstext: "Taxi – 20 € Zuschlag" },
		]);

		expect(decode(file)).toContain("Taxi – 20 € Zuschlag");
	});

	it("keeps the record shape when a booking's text is hostile", () => {
		// The one thing this file must never do is let a description move an
		// amount into another column.
		const lines = decode(
			serializeBuchungsstapel(header, [
				{ ...booking, buchungstext: 'Fest; "Nord"\r\nund Süd' },
			]),
		)
			.split("\r\n")
			.filter((line) => line !== "");

		expect(lines).toHaveLength(3);
		expect(lines[2]?.split(";")).toHaveLength(125);
	});
});
