/**
 * The chart of accounts a Mandant is kept in, as DATEV writes it into header
 * field 27.
 *
 * `"03"` is SKR03 and `"04"` is SKR04. SKR49 exists for Vereine and is
 * deliberately not among them: nothing downstream maps to it, so accepting it
 * would promise support that is not there.
 */
export type Kontenrahmen = "03" | "04";

/**
 * Narrows a stored value to a Kontenrahmen, or `null` if it is not one.
 *
 * The database column is a plain string, so it can hold something the export
 * cannot use — a row written before the enum existed, or one edited around the
 * router. Reading anything else as *unconfigured* is what makes the preflight
 * name the field, rather than the serializer writing a value DATEV refuses the
 * whole file over with no indication which of thirty-one header fields it was.
 *
 * One function rather than one per reader: the preflight and the serializer have
 * to agree on what counts as configured, or the preflight reports a value the
 * serializer must not write.
 */
export function toKontenrahmen(
	value: string | null | undefined,
): Kontenrahmen | null {
	return value === "03" || value === "04" ? value : null;
}
