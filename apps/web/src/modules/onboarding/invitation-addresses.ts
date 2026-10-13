/**
 * The addresses an invite form's rows ask to invite, each once.
 *
 * Blank rows are the form's spare ones, not mistakes. Addresses are compared
 * lowercased, as they are stored: the same colleague typed twice would
 * otherwise send two invitations, concurrently, racing each other for the one
 * pending invitation the address may hold.
 */
export function invitationAddresses(
	rows: readonly { value: string }[],
): string[] {
	const addresses = rows
		.map((row) => row.value.trim().toLowerCase())
		.filter((address) => address !== "");

	return [...new Set(addresses)];
}
