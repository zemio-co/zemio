import { quoteText as quoted } from "./quote";

/**
 * The first line of a DATEV-Format file: 31 fields describing who produced the
 * file, for which Mandant, and over which period.
 *
 * Field names stay in DATEV's own German because they are the vocabulary a
 * Steuerberater uses when handing these values over. Five of them come from the
 * Kanzlei and cannot be guessed: Berater- and Mandantennummer, the start of the
 * Wirtschaftsjahr, the Sachkontenlänge, and the Kontenrahmen.
 */
export type BuchungsstapelHeader = {
	erzeugtAm: Date;
	/** Two-character origin marker for the producing system. */
	herkunft: string;
	exportiertVon: string;
	beraternummer: number;
	mandantennummer: number;
	/**
	 * Start of the fiscal year. Supplies the year for every Belegdatum in the
	 * file, which is why a single file cannot span two Wirtschaftsjahre.
	 */
	wirtschaftsjahrBeginn: Date;
	sachkontenlaenge: number;
	datumVon: Date;
	datumBis: Date;
	bezeichnung: string;
	diktatkuerzel: string;
	festschreibung: boolean;
	/** "03" for SKR03, "04" for SKR04. */
	kontenrahmen: string;
};

const EMPTY = "";

/**
 * Maximum length DATEV accepts for the header's text fields, by field number.
 * The data rows are clamped by `MAX_LENGTH`; without the same clamp here an
 * over-long value — a user id in "Exportiert von", say — reaches DATEV
 * unchanged and the whole file is rejected on a field nobody reads.
 */
const HERKUNFT_MAX = 2;
const EXPORTIERT_VON_MAX = 25;
const BEZEICHNUNG_MAX = 30;
/** `^["]([A-Z]{2}){0,2}["]$` — two editors' initials fit, not just one. */
const DIKTATKUERZEL_MAX = 4;
const KONTENRAHMEN_MAX = 4;

const clamp = (value: string, max: number) => value.slice(0, max);

const pad = (value: number, width: number) =>
	String(value).padStart(width, "0");

/** `YYYYMMDD`, read in UTC so the same instant always yields the same file. */
const datum = (date: Date) =>
	`${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1, 2)}${pad(date.getUTCDate(), 2)}`;

/** `YYYYMMDDHHMMSSFFF` — the 17-digit timestamp DATEV expects in field 6. */
const zeitstempel = (date: Date) =>
	`${datum(date)}${pad(date.getUTCHours(), 2)}${pad(date.getUTCMinutes(), 2)}${pad(
		date.getUTCSeconds(),
		2,
	)}${pad(date.getUTCMilliseconds(), 3)}`;

export function serializeHeader(header: BuchungsstapelHeader): string {
	return [
		quoted("EXTF"), // 1  Kennzeichen
		"700", // 2  Versionsnummer
		"21", // 3  Formatkategorie
		quoted("Buchungsstapel"), // 4  Formatname
		"13", // 5  Formatversion
		zeitstempel(header.erzeugtAm), // 6  Erzeugt am
		EMPTY, // 7  Importiert
		quoted(clamp(header.herkunft, HERKUNFT_MAX)), // 8  Herkunft
		quoted(clamp(header.exportiertVon, EXPORTIERT_VON_MAX)), // 9  Exportiert von
		quoted(EMPTY), // 10 Importiert von
		String(header.beraternummer), // 11 Beraternummer
		String(header.mandantennummer), // 12 Mandantennummer
		datum(header.wirtschaftsjahrBeginn), // 13 WJ-Beginn
		String(header.sachkontenlaenge), // 14 Sachkontenlänge
		datum(header.datumVon), // 15 Datum von
		datum(header.datumBis), // 16 Datum bis
		quoted(clamp(header.bezeichnung, BEZEICHNUNG_MAX)), // 17 Bezeichnung
		quoted(clamp(header.diktatkuerzel, DIKTATKUERZEL_MAX)), // 18 Diktatkürzel
		"1", // 19 Buchungstyp: Finanzbuchführung
		"0", // 20 Rechnungslegungszweck: unabhängig
		header.festschreibung ? "1" : "0", // 21 Festschreibung
		quoted("EUR"), // 22 WKZ
		EMPTY, // 23 reserviert
		quoted(EMPTY), // 24 Derivatskennzeichen
		EMPTY, // 25 reserviert
		EMPTY, // 26 reserviert
		quoted(clamp(header.kontenrahmen, KONTENRAHMEN_MAX)), // 27 Sachkontenrahmen
		EMPTY, // 28 ID der Branchenlösung
		EMPTY, // 29 reserviert
		quoted(EMPTY), // 30 reserviert
		quoted(EMPTY), // 31 Anwendungsinformation
	].join(";");
}
