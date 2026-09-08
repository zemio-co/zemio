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
		// A run of control characters or separators becomes one space, and any
		// whitespace already beside it goes into the same space, so a description
		// written across two lines reads as one sentence rather than carrying a
		// double space where the break was.
		//
		// Deliberately scoped to that run instead of squeezing every `\s{2,}` in
		// the value: a blanket squeeze also rewrites spacing nobody asked it to
		// touch. A cost unit tag is cleared by `isValidKostenstelle`, whose
		// pattern admits a space, so `IT  OPS` passes the preflight and would
		// then reach DATEV as `IT OPS` — a different, and possibly unknown, cost
		// centre. Not rewriting a tag is the whole reason the preflight blocks
		// instead of normalizing.
		.replace(/\s*[\p{Cc};]+\s*/gu, " ")
		.replace(/"/g, '""');

	return `"${escaped}"`;
}
