/** `YYYYMM`, the month a date falls in, read in UTC. */
function yearMonth(date: Date): string {
	return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * DATEV's naming for a Buchungsstapel produced by a third-party application.
 *
 * Lives here rather than in the service that writes the file, because the same
 * name has to come back when a stored export is downloaded again — a file the
 * Kanzlei has already filed away must not reappear under a different name.
 *
 * Both months are named where they differ: a quarter labelled by its first
 * month alone reads as a January stapel in the Kanzlei's folder.
 */
export function buchungsstapelFilename(
	periodFrom: Date,
	periodTo: Date,
): string {
	const from = yearMonth(periodFrom);
	const to = yearMonth(periodTo);

	return `EXTF_Buchungsstapel_${from === to ? from : `${from}-${to}`}.csv`;
}
