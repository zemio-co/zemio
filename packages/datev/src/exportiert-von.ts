/**
 * Turns a person's name into "Exportiert von" (header field 9).
 *
 * The field is what the Kanzlei reads to find out who produced a file, and it
 * is the narrowest text field in the header: `^["]\w{0,25}["]$`, with DATEV's
 * `\w` being `[A-Za-z0-9_]`. No space, no hyphen, no umlaut — so a real name
 * cannot be written as it is spelled, and something has to give.
 *
 * The umlauts are written out before anything else, because the alternative is
 * worse than a missing mark: NFKD splits `ü` into `u` plus a combining
 * diaeresis, the filter below drops the mark, and "Jürgen Müller" arrives as
 * "JurgenMuller" — which reads as a typo rather than as a shortened name.
 * Everything else is folded and stripped, which is right for the accents it
 * covers and gives nothing for a name in a script that has no ASCII form.
 *
 * A name that leaves nothing writable yields an empty field, which the format
 * permits. That says nothing about who exported, and saying nothing is better
 * than a transliteration nobody at the organization would recognize.
 */

const EXPORTIERT_VON_MAX = 25;

/**
 * Written out rather than folded. Includes the uppercase forms, so "Änne"
 * becomes "Aenne" instead of an "nne" the filter would leave behind.
 */
const SPELLED_OUT: Record<string, string> = {
	ä: "ae",
	ö: "oe",
	ü: "ue",
	ß: "ss",
	Ä: "Ae",
	Ö: "Oe",
	Ü: "Ue",
};

/** DATEV's `\w`, not JavaScript's, which would keep letters CP1252 cannot hold. */
const UNWRITABLE = /[^A-Za-z0-9_]/g;

export function toExportiertVon(name: string): string {
	const spelledOut = name.replace(
		/[äöüßÄÖÜ]/g,
		(char) => SPELLED_OUT[char] ?? char,
	);

	// Decomposes an accented letter into its base plus a combining mark, which
	// the filter then removes — so `é` survives as `e` rather than vanishing.
	return spelledOut
		.normalize("NFKD")
		.replace(UNWRITABLE, "")
		.slice(0, EXPORTIERT_VON_MAX);
}
