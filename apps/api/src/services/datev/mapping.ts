import type { Buchungssatz } from "@zemio/datev";
import type { ExpenseType, InputTaxRate } from "@zemio/db";
import { translateExpenseType } from "../pdf/format";

/**
 * The shape the mapping needs, independent of how it was loaded. Amounts arrive
 * as numbers: Prisma Decimals are converted at the repository boundary, the way
 * the rest of the codebase does it.
 */
export type ExportableExpense = {
	id: string;
	description: string | null;
	amount: number;
	startDate: Date;
	type: ExpenseType;
	inputTaxRate: InputTaxRate | null;
	travelDetail: { from: string; to: string; distance: number } | null;
};

export type ExportableReport = {
	tag: number;
	title: string;
	/**
	 * When the organization paid the report out. This is the Belegdatum of every
	 * booking it produces — see `belegdatum` below for why it is not the date on
	 * the receipt. Non-null because only PAID reports are exportable.
	 */
	paidAt: Date;
	costUnit: { tag: string };
	expenses: ExportableExpense[];
};

/** The ledger accounts a Kanzlei dictates, resolved from Settings. */
export type DatevAccounts = {
	expenseAccountReceipt: string;
	expenseAccountTravel: string;
	expenseAccountFood: string;
	contraAccount: string;
};

/** DATEV field 14 (Buchungstext) holds 60 characters. */
const BUCHUNGSTEXT_MAX = 60;

const SEPARATOR = " – ";

/** `dd.MM.yyyy`, read in UTC like every other date on the export path. */
function belegdatum(date: Date): string {
	const day = String(date.getUTCDate()).padStart(2, "0");
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	return `${day}.${month}.${date.getUTCFullYear()}`;
}

/** German decimal comma, with whole numbers left bare: 124 km, not 124,00 km. */
function distance(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: value.toFixed(2).replace(".", ",");
}

/** A blank title leaves the detail alone rather than behind a bare separator. */
function withTitle(title: string, detail: string): string {
	return title === "" ? detail : `${title}${SEPARATOR}${detail}`;
}

/**
 * What the Steuerberater reads next to the amount. The report title carries the
 * occasion, the detail says which expense within it.
 *
 * A travel allowance names its route: the amount is distance times a rate, so
 * without the route the booking cannot be checked against anything later.
 */
function buchungstext(
	report: ExportableReport,
	expense: ExportableExpense,
): string {
	// First, and always: the Belegdatum carries the payment date, so this is the
	// only place left that says which period the cost belongs to. First so that
	// truncating a long detail from the right cannot drop it.
	const parts: string[] = [belegdatum(expense.startDate)];

	if (expense.description) parts.push(expense.description);

	if (expense.type === "TRAVEL" && expense.travelDetail) {
		const { from, to, distance: km } = expense.travelDetail;
		parts.push(`${from} nach ${to}, ${distance(km)} km`);
	}

	// An expense with nothing written on it still needs to say what it was.
	if (parts.length === 1) parts.push(translateExpenseType(expense.type));

	const detail = parts.join(", ");

	// `Report.title` is validated as a non-empty string, which is not the same as
	// a non-blank one: `"   "` passes, and so does a title with trailing spaces.
	// Trimmed here rather than around the separator, so the short path below and
	// the truncating one cannot disagree about what the title is.
	const title = report.title.trim();

	const full = withTitle(title, detail);
	if (full.length <= BUCHUNGSTEXT_MAX) return full;

	// The detail is what tells one row from the next, and on a travel allowance
	// it carries the route the amount is derived from — so it keeps its length
	// and the title gives way. Cutting the tail instead would leave every row of
	// a long-titled report reading the same truncated occasion, with the route it
	// has to be checked against gone.
	//
	// The cut lands mid-word either way; the second trim only keeps it from
	// landing on a space, which would read as a doubled one before the separator.
	const room = BUCHUNGSTEXT_MAX - SEPARATOR.length - detail.length;
	const fitted = title.slice(0, Math.max(room, 0)).trimEnd();

	// Nothing of the title survived, so the detail is written on its own rather
	// than behind a separator with nothing in front of it.
	return fitted === ""
		? detail.slice(0, BUCHUNGSTEXT_MAX)
		: withTitle(fitted, detail);
}

function expenseAccount(type: ExpenseType, accounts: DatevAccounts): string {
	switch (type) {
		case "RECEIPT":
			return accounts.expenseAccountReceipt;
		case "TRAVEL":
			return accounts.expenseAccountTravel;
		case "FOOD":
			return accounts.expenseAccountFood;
	}
}

/**
 * The BU-Schlüssel DATEV derives the input tax from. 9 is 19 %, 8 is 7 %; both
 * are the same in SKR03 and SKR04.
 *
 * Only a receipt can carry input tax. TRAVEL and FOOD are Pauschalen — there is
 * no invoice behind a Kilometerpauschale, so there is nothing to deduct and the
 * field stays empty whatever the row happens to hold.
 */
function buSchluessel(expense: ExportableExpense): string | undefined {
	if (expense.type !== "RECEIPT") return undefined;

	switch (expense.inputTaxRate) {
		case "STANDARD":
			return "9";
		case "REDUCED":
			return "8";
		// The two ways the field ends up empty, kept apart because they are not
		// the same statement: NONE is a receipt with nothing to deduct, null is a
		// row from before the column existed, where nobody ever entered a rate.
		//
		// Listing them does not make the switch exhaustive — the return type
		// admits undefined, so a rate added to the enum would fall through to an
		// empty BU-Schlüssel rather than fail the build. That is the safe
		// direction (it claims no deduction) but it is silent, so a new rate has
		// to be wired up here by hand.
		case "NONE":
		case null:
			return undefined;
	}
}

export function toBookings(
	reports: readonly ExportableReport[],
	accounts: DatevAccounts,
): Buchungssatz[] {
	// Sorted rather than taken as given: the same selection has to produce the
	// same file, and a query's row order is not a promise.
	return [...reports]
		.sort((a, b) => a.tag - b.tag)
		.flatMap((report) =>
			// Expense carries no createdAt, so id is the only stable ordering there is.
			// Without a stable order the Belegfeld numbers would shift between runs and
			// the same selection would stop producing the same file.
			[...report.expenses]
				// DATEV rejects an Umsatz of 0,00. Dropped before numbering so the
				// Belegfeld numbers run without gaps; the preflight is what tells the
				// admin a row was left out.
				.filter((expense) => expense.amount !== 0)
				// Compared by code point rather than with localeCompare: collation is
				// tailored per locale and per ICU build, so the same selection could
				// renumber on a host configured differently. Cuids are ASCII, which is
				// all code-point order needs to be total here.
				.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
				.map((expense, position) => ({
					// DATEV's Umsatz field is unsigned — the direction of a booking
					// lives in the Soll/Haben-Kennzeichen alone. A negative amount is a
					// repayment, so its sign belongs in that field rather than in the
					// amount, which the serializer would refuse outright.
					umsatz: Math.abs(expense.amount),
					sollHaben: expense.amount < 0 ? ("H" as const) : ("S" as const),
					konto: expenseAccount(expense.type, accounts),
					gegenkonto: accounts.contraAccount,
					buSchluessel: buSchluessel(expense),
					// The report's payment date, not the expense's own. DATEV writes
					// the Belegdatum as four digits and takes the year from the
					// Wirtschaftsjahr in the header, so a date outside the exported
					// year imports under the wrong one with nothing looking wrong.
					// paidAt is inside the period by construction; the receipt's own
					// date goes into the Buchungstext instead.
					belegdatum: report.paidAt,
					belegfeld1: `${report.tag}-${position + 1}`,
					buchungstext: buchungstext(report, expense),
					kostenstelle: report.costUnit.tag,
				})),
		);
}
