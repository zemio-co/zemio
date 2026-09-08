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
 * 2 March, and `29.02.2026` to 1 March. It also catches `Date.UTC`'s two-digit
 * year rule — a year below 100 is read as 1900 plus it, so `01.03.0026` builds
 * 1926 — which is why the check has to stay even though the regex already
 * demands four digits.
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

/**
 * `dd.MM.yyyy` for a day stored at UTC midnight — the inverse of
 * `parseCalendarDate`, and the only safe way to put such a day back into a
 * field the user can edit.
 *
 * `date-fns`' `formatDate` reads local getters, so west of UTC it renders the
 * day before: an expense stored as `2026-03-01` shows as `28.02.2026`, and
 * saving the form back writes that wrong day into the `@db.Date` column for
 * good. Reading with `getUTC*` keeps the round trip lossless in every zone.
 */
export function formatCalendarDate(date: Date): string {
	const day = String(date.getUTCDate()).padStart(2, "0");
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");

	return `${day}.${month}.${date.getUTCFullYear()}`;
}

/**
 * The same day as a local `Date`, so `date-fns` patterns can be used on it
 * without its local getters shifting the day.
 *
 * Only for rendering. The result is *not* the instant that was stored — it is a
 * local midnight carrying the stored calendar day — so it must never be written
 * back or compared against a stored value.
 */
export function toDisplayDate(date: Date): Date {
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
