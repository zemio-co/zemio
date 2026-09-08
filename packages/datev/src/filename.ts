/** `YYYYMM`, the month a date falls in, read in UTC. */
function yearMonth(date: Date): string {
	return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** `YYYYMMDD`, the day a date falls on, read in UTC. */
function yearMonthDay(date: Date): string {
	return `${yearMonth(date)}${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Whether the period is exactly one whole calendar month — the first to the
 * last of the same month, whatever its length.
 */
function coversWholeMonth(periodFrom: Date, periodTo: Date): boolean {
	const daysInMonth = new Date(
		Date.UTC(periodTo.getUTCFullYear(), periodTo.getUTCMonth() + 1, 0),
	).getUTCDate();

	return (
		yearMonth(periodFrom) === yearMonth(periodTo) &&
		periodFrom.getUTCDate() === 1 &&
		periodTo.getUTCDate() === daysInMonth
	);
}

/**
 * The period as the name states it: a whole month by its month, anything else
 * by its days.
 *
 * Naming a part of a month after the month would over-claim — a Kanzlei that
 * files `202608` reads it as the August stapel, and August is not done. It
 * would also collide: two exports covering different halves of one month would
 * arrive in the same download folder under one name, so the second overwrites
 * the first or lands beside it as a browser-numbered copy.
 *
 * Whole months keep the short form, because that is the only period the export
 * UI offers and the one a Kanzlei asks for by name.
 */
function periodSegment(periodFrom: Date, periodTo: Date): string {
	if (coversWholeMonth(periodFrom, periodTo)) return yearMonth(periodFrom);

	const from = yearMonthDay(periodFrom);
	const to = yearMonthDay(periodTo);

	return from === to ? from : `${from}-${to}`;
}

/**
 * DATEV's naming for a Buchungsstapel produced by a third-party application.
 *
 * Lives here rather than in the service that writes the file, because the same
 * name has to come back when a stored export is downloaded again — a file the
 * Kanzlei has already filed away must not reappear under a different name. It
 * is therefore derived from the period alone, and two exports of the identical
 * period do share a name; that is a re-export of what one file already covered,
 * which is only reachable after deleting the first.
 */
export function buchungsstapelFilename(
	periodFrom: Date,
	periodTo: Date,
): string {
	return `EXTF_Buchungsstapel_${periodSegment(periodFrom, periodTo)}.csv`;
}
