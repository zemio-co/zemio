/**
 * Single source of truth for reading the calendar days users type.
 *
 * An expense date is a **day**, not an instant: what matters is that it is the
 * 1st of March, never what o'clock. `parse` from date-fns returns local
 * midnight, so on a host east of UTC the 1st of March is stored as
 * `2026-02-28T23:00:00Z` — and whether that reads back as the 28th or the 1st
 * then depends on which getter the reader happens to use. The DATEV export
 * reads with `getUTC*`, the PDF formats locally, and the two disagreed.
 *
 * Normalizing on the way in is what makes the stored day the day that was
 * typed, whatever the server's timezone. The columns are `@db.Date`, so there
 * is no time component left to misread either.
 */

/**
 * `d.M.yyyy` through `dd.MM.yyyy`. One and two digit days and months are both
 * accepted because someone typing into the field writes `1.3.2026`, but the
 * year has to be all four: date-fns took `01.03.26` for the year 26 AD, and a
 * silently accepted two-digit year is a worse outcome than a rejected one.
 */
const GERMAN_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

/**
 * The day `value` names, at UTC midnight, or `null` if it is not a real German
 * date.
 *
 * The components are checked back against the date they build, which is what
 * rejects a day that does not exist: `31.02.2026` would otherwise roll over to
 * 2 March, and `29.02.2026` to 1 March.
 */
export function parseCalendarDate(value: string): Date | null {
	const match = GERMAN_DATE.exec(value);
	if (!match) return null;

	const [, day, month, year] = match.map(Number) as [
		number,
		number,
		number,
		number,
	];

	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
		? date
		: null;
}
