import iconv from "iconv-lite";
import { COLUMNS } from "./fields";
import { type BuchungsstapelHeader, serializeHeader } from "./header";
import { type Buchungssatz, serializeRow } from "./row";

/**
 * DATEV reads ISO-8859-1 / CP1252 by default. Unicode is only understood on a
 * manual import into DATEV Rechnungswesen or through the online API — the
 * KrStaPv console import cannot read it at all. Since the importing Kanzlei
 * chooses the channel and we never learn which, CP1252 is the only encoding
 * that works everywhere.
 */
const ENCODING = "win1252";

const CRLF = "\r\n";

/**
 * Serializes a complete DATEV-Format Buchungsstapel: the 31-field header, the
 * 125 column names, then one line per booking.
 */
export function serializeBuchungsstapel(
	header: BuchungsstapelHeader,
	bookings: readonly Buchungssatz[],
): Buffer {
	const lines = [
		serializeHeader(header),
		COLUMNS.join(";"),
		...bookings.map(serializeRow),
	];

	return iconv.encode(`${lines.join(CRLF)}${CRLF}`, ENCODING);
}
