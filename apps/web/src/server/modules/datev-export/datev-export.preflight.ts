import { fiscalYearStartFor, isValidKostenstelle } from "@zemio/datev";

/**
 * Everything that has to be true before a DATEV export may run.
 *
 * The export refuses rather than writing placeholders: a Buchungsstapel with a
 * made-up Sachkonto is exactly the manual rework the export exists to remove,
 * and it would reach the Steuerberater looking like real data.
 */

/**
 * The DATEV settings of an organization. Every field is nullable because none
 * of them can be guessed — five are dictated by the Kanzlei, four are the
 * account mapping it signs off.
 */
export type DatevConfiguration = {
	beraternummer: number | null;
	mandantennummer: number | null;
	wirtschaftsjahrBeginn: Date | null;
	sachkontenlaenge: number | null;
	kontenrahmen: string | null;
	expenseAccountReceipt: string | null;
	expenseAccountTravel: string | null;
	expenseAccountFood: string | null;
	contraAccount: string | null;
};

export type DatevConfigurationField = keyof DatevConfiguration;

/** Only what the checks look at, not the full report. */
export type PreflightReport = {
	tag: number;
	costUnitTag: string;
	expenses: { amount: number }[];
};

export type PreflightInput = {
	configuration: DatevConfiguration;
	reports: readonly PreflightReport[];
	periodFrom: Date;
	periodTo: Date;
};

/** Nothing can be exported until these are resolved. */
export type PreflightBlocker =
	| { kind: "missingConfiguration"; fields: DatevConfigurationField[] }
	| { kind: "costUnitNotExportable"; costUnitTag: string; reportTags: number[] }
	| { kind: "periodCrossesFiscalYear"; fiscalYearStarts: [Date, Date] };

/**
 * Things the admin should know that do not stop the export. Kept separate from
 * blockers so a note about one skipped row cannot be mistaken for a reason the
 * file did not appear.
 */
export type PreflightNotice =
	| { kind: "zeroAmountSkipped"; reportTag: number; count: number }
	| { kind: "reportWithoutBookings"; reportTag: number };

export type PreflightResult = {
	blockers: PreflightBlocker[];
	notices: PreflightNotice[];
};

/** Declared in the order the settings form shows them. */
const REQUIRED_FIELDS: DatevConfigurationField[] = [
	"beraternummer",
	"mandantennummer",
	"wirtschaftsjahrBeginn",
	"sachkontenlaenge",
	"kontenrahmen",
	"expenseAccountReceipt",
	"expenseAccountTravel",
	"expenseAccountFood",
	"contraAccount",
];

/**
 * A `Date` that is not a date. `new Date("")` is still a Date object and still
 * clears a null check, and its `getTime()` is `NaN` — which compares unequal to
 * itself, so carrying one into the fiscal-year arithmetic would report every
 * period as crossing a year boundary and point the admin at the period instead
 * of at the settings row that is broken.
 */
function isUsableDate(value: Date | null): value is Date {
	return value !== null && !Number.isNaN(value.getTime());
}

/**
 * Blank counts as missing: an account saved as an empty string would pass a
 * null check and then be written into DATEV's Konto field as nothing at all,
 * which is the placeholder booking this preflight exists to prevent.
 *
 * A number that is not one counts too. `serializeHeader` writes the
 * Beraternummer and the Sachkontenlänge with `String(...)`, so a 0 from an
 * untouched form field, or the `NaN` an empty numeric input parses to, would
 * reach the Kanzlei as "0" or "NaN" in the header and the whole file would be
 * refused on import. This says nothing about DATEV's ranges for those two
 * fields — that belongs in the settings form, which is where a value first
 * arrives; it only rules out what is not a value at all.
 */
function isMissing(
	value: DatevConfiguration[DatevConfigurationField],
): boolean {
	if (value instanceof Date) return !isUsableDate(value);
	if (typeof value === "number") return !Number.isFinite(value) || value <= 0;
	return value === null || (typeof value === "string" && value.trim() === "");
}

/** The four fields that hold a ledger account number. */
const ACCOUNT_FIELDS = new Set<DatevConfigurationField>([
	"expenseAccountReceipt",
	"expenseAccountTravel",
	"expenseAccountFood",
	"contraAccount",
]);

/**
 * DATEV's Konto and Gegenkonto are numeric fields of nine digits, and the
 * serializer writes them unquoted — so it can only refuse a separator or a line
 * break, not a letter or a space. `123 4` therefore reaches the Kanzlei looking
 * like a real account and the whole file is refused on import.
 *
 * The settings form already holds a typed value to this shape; this is for the
 * ones it cannot vouch for — a row written before that validator existed, or
 * straight into the database. Reported as an unusable configuration field so
 * the admin is pointed at the account rather than at a rejected file.
 */
const LEDGER_ACCOUNT = /^\d{1,9}$/;

function isUnusable(
	field: DatevConfigurationField,
	value: DatevConfiguration[DatevConfigurationField],
): boolean {
	if (isMissing(value)) return true;
	return ACCOUNT_FIELDS.has(field) && !LEDGER_ACCOUNT.test(value as string);
}

function missingConfiguration(
	configuration: DatevConfiguration,
): DatevConfigurationField[] {
	return REQUIRED_FIELDS.filter((field) =>
		isUnusable(field, configuration[field]),
	);
}

/**
 * Cost unit tags DATEV's KOST1 field cannot carry, grouped by tag: one unusable
 * tag is one thing to fix, however many reports happen to use it.
 *
 * Deliberately not normalized into something that would import — a tag silently
 * turned from `IT-Ops` into `IT_Ops` books against a cost centre that does not
 * exist in the Kanzlei's KOST program.
 */
function unusableCostUnits(
	reports: readonly PreflightReport[],
): PreflightBlocker[] {
	const affected = new Map<string, number[]>();

	for (const report of reports) {
		// A report that writes no row cannot put a tag in the file. Blocking the
		// export over one would refuse a file the tag never reaches, and the
		// zero-amount notice already says why nothing is written for it.
		if (!writesBookings(report)) continue;
		if (isValidKostenstelle(report.costUnitTag)) continue;
		const tags = affected.get(report.costUnitTag) ?? [];
		tags.push(report.tag);
		affected.set(report.costUnitTag, tags);
	}

	return [...affected].map(([costUnitTag, reportTags]) => ({
		kind: "costUnitNotExportable" as const,
		costUnitTag,
		reportTags,
	}));
}

/**
 * Whether an expense becomes a booking. DATEV rejects an Umsatz of 0,00, so
 * `toBookings` drops such a row — every check that reasons about what the file
 * will contain has to drop it too.
 */
const isBooked = (expense: PreflightReport["expenses"][number]) =>
	expense.amount !== 0;

/** Whether a report puts anything at all into the file. */
const writesBookings = (report: PreflightReport) =>
	report.expenses.some(isBooked);

/**
 * How many bookings the selection would actually write. Reports are not the
 * unit that matters: one whose every expense is 0,00 contributes no row, and a
 * file with no rows must not claim the reports it was built from.
 */
export function countBookings(reports: readonly PreflightReport[]): number {
	return reports.reduce(
		(total, report) => total + report.expenses.filter(isBooked).length,
		0,
	);
}

/**
 * DATEV rejects an Umsatz of 0,00, so such a row cannot go into the file. The
 * row is dropped and the admin told, because a PAID report is immutable — there
 * is no edit that would make it exportable, and blocking would strand the whole
 * report for good.
 */
function zeroAmounts(reports: readonly PreflightReport[]): PreflightNotice[] {
	return reports.flatMap((report) => {
		const count = report.expenses.filter((expense) => !isBooked(expense)).length;
		return count > 0
			? [{ kind: "zeroAmountSkipped" as const, reportTag: report.tag, count }]
			: [];
	});
}

/**
 * A report the export takes but writes nothing for: it carries no expenses at
 * all, or every one of them is 0,00.
 *
 * Worth a notice of its own because the export still marks such a report
 * exported — that is what keeps it out of the next selection — so without this
 * it would simply disappear from the list, having never reached the Kanzlei.
 * Not a blocker, for the same reason a zero amount is not: a PAID report cannot
 * be edited into something bookable.
 */
function reportsWithoutBookings(
	reports: readonly PreflightReport[],
): PreflightNotice[] {
	return reports
		.filter((report) => !writesBookings(report))
		.map((report) => ({
			kind: "reportWithoutBookings" as const,
			reportTag: report.tag,
		}));
}

/**
 * A Belegdatum is written as four digits, `TTMM`; its year comes from the
 * Wirtschaftsjahr in the header. A period spanning a boundary would therefore
 * need two different years in one header, and one side of it would import a
 * year out with nothing in the file looking wrong.
 *
 * This is the only check the four-digit date still needs. Every Belegdatum is
 * the report's `paidAt`, which the selection guarantees lies inside the period
 * — so once the period sits within one Wirtschaftsjahr, so does every booking.
 * An expense dated in an earlier year is no longer a problem: its own date goes
 * into the Buchungstext, where the year is written out in full.
 */
function fiscalYearProblems(
	input: PreflightInput,
	configuredStart: Date,
): PreflightBlocker[] {
	const fromYear = fiscalYearStartFor(input.periodFrom, configuredStart);
	const toYear = fiscalYearStartFor(input.periodTo, configuredStart);

	return fromYear.getTime() === toYear.getTime()
		? []
		: [{ kind: "periodCrossesFiscalYear", fiscalYearStarts: [fromYear, toYear] }];
}

export function checkExportPreconditions(
	input: PreflightInput,
): PreflightResult {
	const { wirtschaftsjahrBeginn } = input.configuration;
	const missing = missingConfiguration(input.configuration);

	// Reported alone: without accounts there is nothing to check the rest
	// against, and a wall of follow-on errors would bury the one thing to fix.
	//
	// The second test is how the fiscal-year start gets its type, not a second
	// rule: `wirtschaftsjahrBeginn` is one of REQUIRED_FIELDS, so an unusable one
	// is already in `missing` and the first test has returned. It stands where an
	// `as Date` used to, which asserted only what `isMissing` checks for null and
	// would have waved an unparseable date through into the arithmetic.
	if (missing.length > 0 || !isUsableDate(wirtschaftsjahrBeginn)) {
		return {
			blockers: [{ kind: "missingConfiguration", fields: missing }],
			notices: [],
		};
	}

	return {
		blockers: [
			...unusableCostUnits(input.reports),
			...fiscalYearProblems(input, wirtschaftsjahrBeginn),
		],
		notices: [
			...zeroAmounts(input.reports),
			...reportsWithoutBookings(input.reports),
		],
	};
}
