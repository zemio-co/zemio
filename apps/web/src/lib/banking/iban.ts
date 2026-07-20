/** Strips formatting whitespace from a user-entered or stored IBAN. */
export function normalizeIban(iban: string): string {
	return iban.replace(/\s+/g, "");
}
