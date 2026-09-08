/**
 * DATEV wraps text fields in double quotes, so the content has to be escaped
 * before it goes in.
 *
 * Two of the three rules are DATEV's own, from the technical description of the
 * format: "Wenn ein Text-Datenfeld Anführungszeichen enthält, müssen diese
 * verdoppelt werden. Steuerungszeichen innerhalb von Text-Datenfeldern sind
 * nicht zulässig (z.B. Zeilenumbruch)."
 *
 * The semicolon is ours. DATEV's field pattern for Buchungstext permits one
 * inside the quotes, but the reader on the other side may be the KrStaPv
 * console import, which splits on semicolons without honouring the quotes —
 * the same reason the file is written as CP1252 rather than UTF-8. A semicolon
 * that survives into a text field shifts every later field by one, so an
 * amount can end up read as someone else's column. Losing a semicolon out of a
 * description costs nothing next to that, so it is folded away too.
 *
 * Everything that reaches a text field is user-entered — report titles,
 * expense descriptions, city names, cost unit tags — so none of this is
 * theoretical.
 */
export function quoteText(value: string): string {
	const escaped = value
		// A run of control characters or separators becomes one space, so a
		// description written across two lines reads as one sentence, and the
		// space it leaves next to an existing one is squeezed back out — a field
		// this narrow has no characters to spare.
		.replace(/[\p{Cc};]+/gu, " ")
		.replace(/\s{2,}/g, " ")
		.replace(/"/g, '""');

	return `"${escaped}"`;
}
