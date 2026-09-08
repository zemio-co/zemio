/**
 * The start of the Wirtschaftsjahr that contains `date`, taking the month and
 * day from the configured start so a fiscal year need not begin in January.
 *
 * Derived rather than read straight from the setting, so the setting does not
 * have to be edited every year. Both the preflight that blocks an out-of-year
 * expense and the header that carries the year have to agree on this, which is
 * why it lives in the package they share rather than in either of them.
 */
export function fiscalYearStartFor(date: Date, configuredStart: Date): Date {
	const sameYear = Date.UTC(
		date.getUTCFullYear(),
		configuredStart.getUTCMonth(),
		configuredStart.getUTCDate(),
	);

	return new Date(
		sameYear <= date.getTime()
			? sameYear
			: Date.UTC(
					date.getUTCFullYear() - 1,
					configuredStart.getUTCMonth(),
					configuredStart.getUTCDate(),
				),
	);
}
