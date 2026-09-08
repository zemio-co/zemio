/**
 * Field-level rules from DATEV's format description, as regular expressions
 * over the *content* of a field — the quotes DATEV's own patterns include are
 * added at serialization time.
 *
 * DATEV defines `\w` in its patterns as `[a-zA-Z0-9_]`, which is narrower than
 * JavaScript's, so the character classes are spelled out here rather than
 * reusing `\w`. Anything outside them is rejected: "Andere Zeichen sind
 * unzulässig (insbesondere Leerzeichen, Umlaute, Punkt, Komma, Semikolon und
 * Doppelpunkt)."
 *
 * Both classes being ASCII is also what makes the length limits mean one thing:
 * a value that passes is 36 characters, 36 UTF-16 units and 36 CP1252 bytes at
 * once, so nothing multi-byte can sit inside the count DATEV checks.
 *
 * Two deliberate departures from the patterns as DATEV writes them:
 *
 * `{0,36}` is tightened to `{1,36}`. DATEV permits an empty field; here an
 * empty value means the data is missing rather than short, and both call sites
 * always have one — a Belegfeld 1 the export composes from the report number,
 * and a cost unit tag the database requires. Reporting it as unusable is what
 * the caller wants; writing it is not.
 *
 * Neither pattern carries the `m` flag, so `$` is the end of the input rather
 * than the end of a line: a value with a trailing line break is rejected, not
 * accepted as the part before it. That matters because the serializer folds
 * control characters in a quoted field into a space, which would turn a tag
 * into a different, importable one.
 */

/**
 * Belegfeld 1 (field 11) — `^(["][\w$&%*+\-\/]{0,36}["])$`.
 * Takes a hyphen, but no space.
 */
const BELEGFELD_1 = /^[A-Za-z0-9_$&%*+\-/]{1,36}$/;

/**
 * KOST1 (field 37) — `^(["][\w ]{0,36}["])$`.
 * Takes a space, but no hyphen — almost the inverse of Belegfeld 1.
 *
 * Note that the length DATEV actually accepts is whatever the Kanzlei
 * configured in its KOST program, which is usually shorter than 36. This is the
 * format ceiling, not a promise that 36 characters arrive.
 */
const KOSTENSTELLE = /^[A-Za-z0-9_ ]{1,36}$/;

export function isValidBelegfeld1(value: string): boolean {
	return BELEGFELD_1.test(value);
}

export function isValidKostenstelle(value: string): boolean {
	return KOSTENSTELLE.test(value);
}
