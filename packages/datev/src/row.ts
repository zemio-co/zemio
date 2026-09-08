import { COLUMNS, MAX_LENGTH, QUOTED } from "./fields";
import { quoteText } from "./quote";

/**
 * One booking in the vocabulary of the DATEV format. Field names stay German
 * because that is what a Steuerberater reads them back as.
 *
 * `umsatz` is the gross amount: DATEV has no tax field of its own, so the tax
 * is derived from the amount and the BU-Schlüssel by DATEV's Automatik.
 */
export type Buchungssatz = {
	umsatz: number;
	sollHaben: "S" | "H";
	konto: string;
	gegenkonto: string;
	/** Omitted where no input tax is claimed. */
	buSchluessel?: string;
	/**
	 * A calendar date, and it must be the UTC midnight of that day — every date
	 * in this package is read with the UTC getters so that one instant always
	 * yields one file, whatever the exporting machine is set to. That only says
	 * the right thing if the day was stored in UTC to begin with: a date built
	 * as local midnight is a day early wherever the offset is positive, so
	 * `new Date(2026, 7, 14)` under `TZ=Europe/Berlin` writes Belegdatum 1308.
	 */
	belegdatum: Date;
	belegfeld1: string;
	buchungstext: string;
	kostenstelle?: string;
};

/**
 * A field DATEV does not quote has no way to carry a separator or a line break.
 * Konto and Gegenkonto are such fields and arrive as strings from the
 * organisation's settings, where nothing has yet checked their shape.
 */
const BREAKS_RECORD = /[;"\p{Cc}]/u;

/** Column positions, resolved once rather than scanned per field per row. */
const INDEX = new Map(COLUMNS.map((column, position) => [column, position]));

const index = (column: (typeof COLUMNS)[number]) => INDEX.get(column) as number;

const pad = (value: number, width: number) =>
	String(value).padStart(width, "0");

/** `TTMM`. The year is carried by the Wirtschaftsjahr in the header. */
const belegdatum = (date: Date) =>
	`${pad(date.getUTCDate(), 2)}${pad(date.getUTCMonth() + 1, 2)}`;

/**
 * DATEV's own pattern for field 1, over the content of the field: a positive
 * amount, at most ten digits before the comma and exactly two after it, and
 * never zero.
 */
const UMSATZ = /^(?!0{1,10},00$)\d{1,10},\d{2}$/;

/**
 * DATEV writes amounts with a comma and no thousands separator.
 *
 * An amount that does not fit the field is refused rather than written. It
 * cannot be truncated — cutting `123456789,01` to the field's ten characters
 * leaves `123456789,`, and cutting `1234567890,12` leaves `1234567890`, which
 * is the same number a thousandfold. It cannot be rounded away either. A
 * booking whose amount cannot be stated exactly has no business in a file a
 * Steuerberater imports, so this throws and the export fails loudly.
 */
const betrag = (value: number) => {
	const formatted = value.toFixed(2).replace(".", ",");

	if (!UMSATZ.test(formatted)) {
		throw new RangeError(
			`Umsatz ${value} is not a DATEV amount: DATEV takes a positive amount below 10000000000,00.`,
		);
	}

	return formatted;
};

export function serializeRow(booking: Buchungssatz): string {
	const values: string[] = new Array(COLUMNS.length).fill("");

	values[index("Umsatz (ohne Soll/Haben-Kz)")] = betrag(booking.umsatz);
	values[index("Soll/Haben-Kennzeichen")] = booking.sollHaben;
	values[index("Konto")] = booking.konto;
	values[index("Gegenkonto (ohne BU-Schlüssel)")] = booking.gegenkonto;
	values[index("BU-Schlüssel")] = booking.buSchluessel ?? "";
	values[index("Belegdatum")] = belegdatum(booking.belegdatum);
	values[index("Belegfeld 1")] = booking.belegfeld1;
	values[index("Buchungstext")] = booking.buchungstext;
	values[index("KOST1 - Kostenstelle")] = booking.kostenstelle ?? "";

	return values
		.map((value, i) => {
			// MAX_LENGTH is DATEV's `Length`, which counts characters only for a
			// text field. For a Betrag or a Zahl it counts the digits before the
			// comma — field 1 is Length 10 but holds the thirteen characters of
			// `1234567890,12` — so cutting a numeric field to it would change the
			// number. Those fields are checked where they are formatted instead.
			if (!QUOTED[i]) {
				if (BREAKS_RECORD.test(value)) {
					throw new Error(
						`${COLUMNS[i]} is written unquoted and cannot hold ${JSON.stringify(value)}: it would break the record apart.`,
					);
				}

				return value;
			}

			// Truncated before quoting: DATEV's limit is on the content, and the
			// doubling an escape adds is not part of it.
			return quoteText(value.slice(0, MAX_LENGTH[i]));
		})
		.join(";");
}
