import { createHash, randomUUID } from "node:crypto";
import {
	buchungsstapelFilename,
	fiscalYearStartFor,
	serializeBuchungsstapel,
} from "@zemio/datev";
import { ReportStatus } from "@zemio/db";
import { db } from "../../lib/db";
import { getPresignedDownloadUrl, uploadToStorage } from "../../lib/storage";
import {
	type DatevAccounts,
	type ExportableReport,
	toBookings,
} from "./mapping";

export type BuchungsstapelRequest = {
	organizationId: string;
	periodFrom: Date;
	periodTo: Date;
	/**
	 * The reports the caller's preflight passed. Named rather than re-selected
	 * here: re-running the query would export whatever the period happens to
	 * hold now, including a report that turned PAID after the preflight and so
	 * had its cost unit and expense dates checked by nobody.
	 */
	reportIds: string[];
	/** Written into the header as "Exportiert von". */
	exportedBy: string;
};

export type BuchungsstapelResult = {
	url: string;
	filename: string;
	key: string;
	checksum: string;
	reportIds: string[];
};

const CONTENT_TYPE = "text/csv";

/**
 * Names the batch in the Kanzlei's list — DATEV header field 17, thirty
 * characters over `[\w.-/ ]`. Written as `Spesen 08/2026` rather than a bare
 * "Spesen": a constant made every export read identically there, with only the
 * filename telling them apart.
 */
function batchName(periodFrom: Date): string {
	const month = String(periodFrom.getUTCMonth() + 1).padStart(2, "0");
	return `Spesen ${month}/${periodFrom.getUTCFullYear()}`;
}

/** A setting that is present but empty is no setting at all. */
function isPresent(value: string | null): value is string {
	return value !== null && value.trim() !== "";
}

/**
 * The Belegdatum of every booking a report produces, checked against the one
 * Wirtschaftsjahr the header carries.
 *
 * Two things have to hold. `Report.paidAt` is nullable in the schema, though it
 * is set on every transition into PAID — a missing one would silently date a
 * whole report to today. And it has to fall inside the exported Wirtschaftsjahr:
 * a Belegdatum is written as `TTMM` and takes its year from the header, so a
 * report paid outside that year imports a year out with nothing in the file
 * looking wrong.
 *
 * The caller holds both by convention — it selects reports by `paidAt` and its
 * preflight refuses a period spanning two Wirtschaftsjahre — but neither
 * survives the boundary: the ids and the period arrive as two independent
 * fields, and this is the only place that has the reports, the period and the
 * year the header will declare. Refusing beats defaulting, as it does for the
 * accounts above.
 *
 * Deliberately not a 409. Neither case is a race an admin could retry away: a
 * PAID report without a payment date, or a selection that does not match its
 * period, is a fault in the data or in the caller, and a conflict would invite
 * a retry that fails identically forever.
 */
function belegdatumOrRefuse(
	report: { tag: number; paidAt: Date | null },
	wirtschaftsjahrBeginn: Date,
	configuredStart: Date,
): Date {
	if (!report.paidAt) {
		throw new Error(`Report ${report.tag} is paid but carries no payment date`);
	}

	if (
		fiscalYearStartFor(report.paidAt, configuredStart).getTime() !==
		wirtschaftsjahrBeginn.getTime()
	) {
		throw new Error(
			`Report ${report.tag} was paid outside the Wirtschaftsjahr this export declares`,
		);
	}

	return report.paidAt;
}

/**
 * Builds the Buchungsstapel for a period and stores it.
 *
 * The file is kept rather than regenerated on demand: a later change to the
 * serializer, or to DATEV's yearly format version, would otherwise quietly
 * produce a different file for the same selection.
 */
export async function generateBuchungsstapel(
	request: BuchungsstapelRequest,
): Promise<BuchungsstapelResult> {
	const settings = await db.settings.findUnique({
		where: { organizationId: request.organizationId },
	});

	if (
		settings?.datevBeraternummer == null ||
		settings.datevMandantennummer == null ||
		settings.datevWirtschaftsjahrBeginn == null ||
		settings.datevSachkontenlaenge == null ||
		// Blank counts as unconfigured, like it does in the caller's preflight: an
		// account saved as an empty string would clear a null check and then reach
		// DATEV as a booking against no account at all.
		!isPresent(settings.datevKontenrahmen) ||
		!isPresent(settings.datevExpenseAccountReceipt) ||
		!isPresent(settings.datevExpenseAccountTravel) ||
		!isPresent(settings.datevExpenseAccountFood) ||
		!isPresent(settings.datevContraAccount)
	) {
		// The caller runs the preflight and names the missing fields; reaching here
		// means the configuration changed in between.
		throw Object.assign(new Error("DATEV configuration incomplete"), {
			status: 409,
		});
	}

	// Bound to a const so the narrowing above survives into the mapping closure.
	const configuredStart = settings.datevWirtschaftsjahrBeginn;

	// Derived from the period, not taken as stored: the setting carries the month
	// and day a fiscal year starts on, and its year is whichever one it was first
	// entered in. Writing that year verbatim would book every TTMM Belegdatum
	// into it. Held in one place because the header declares it and every
	// Belegdatum is checked against it.
	const wirtschaftsjahrBeginn = fiscalYearStartFor(
		request.periodFrom,
		configuredStart,
	);

	const rows = await db.report.findMany({
		where: {
			id: { in: request.reportIds },
			organizationId: request.organizationId,
			status: ReportStatus.PAID,
			datevExportId: null,
		},
		select: {
			id: true,
			tag: true,
			title: true,
			paidAt: true,
			costUnit: { select: { tag: true } },
			expenses: {
				select: {
					id: true,
					description: true,
					amount: true,
					startDate: true,
					type: true,
					inputTaxRate: true,
					travelDetail: { select: { from: true, to: true, distance: true } },
				},
			},
		},
		orderBy: { tag: "asc" },
	});

	// Every named report was claimed between the caller's preflight and this
	// query, so there is nothing left to write. Refused before the upload rather
	// than after it: the caller turns an empty `reportIds` into a conflict and
	// records no export, which would leave a header-only object in storage with
	// no row anywhere referencing it.
	if (rows.length === 0) {
		throw Object.assign(
			new Error("These reports were exported by another export"),
			{ status: 409 },
		);
	}

	const reports: ExportableReport[] = rows.map((report) => ({
		tag: report.tag,
		title: report.title,
		paidAt: belegdatumOrRefuse(report, wirtschaftsjahrBeginn, configuredStart),
		costUnit: report.costUnit,
		expenses: report.expenses.map((expense) => ({
			id: expense.id,
			description: expense.description,
			amount: expense.amount.toNumber(),
			startDate: expense.startDate,
			type: expense.type,
			inputTaxRate: expense.inputTaxRate,
			travelDetail: expense.travelDetail
				? {
						from: expense.travelDetail.from,
						to: expense.travelDetail.to,
						distance: expense.travelDetail.distance.toNumber(),
					}
				: null,
		})),
	}));

	const accounts: DatevAccounts = {
		expenseAccountReceipt: settings.datevExpenseAccountReceipt,
		expenseAccountTravel: settings.datevExpenseAccountTravel,
		expenseAccountFood: settings.datevExpenseAccountFood,
		contraAccount: settings.datevContraAccount,
	};

	const file = serializeBuchungsstapel(
		{
			erzeugtAm: new Date(),
			herkunft: "ZE",
			exportiertVon: request.exportedBy,
			beraternummer: settings.datevBeraternummer,
			mandantennummer: settings.datevMandantennummer,
			// The caller's preflight blocks a period that crosses a boundary, and
			// `belegdatumOrRefuse` has held every booking against this value, so one
			// year covers the whole file.
			wirtschaftsjahrBeginn,
			sachkontenlaenge: settings.datevSachkontenlaenge,
			datumVon: request.periodFrom,
			datumBis: request.periodTo,
			// Names the batch in the Kanzlei's list. A constant made every export
			// read the same there, with only the filename telling them apart.
			bezeichnung: batchName(request.periodFrom),
			diktatkuerzel: "",
			festschreibung: settings.datevFestschreibung,
			kontenrahmen: settings.datevKontenrahmen,
		},
		toBookings(reports, accounts),
	);

	const key = `datev/${request.organizationId}/${randomUUID()}.csv`;
	await uploadToStorage(key, file, CONTENT_TYPE);

	const downloadName = buchungsstapelFilename(
		request.periodFrom,
		request.periodTo,
	);

	return {
		url: await getPresignedDownloadUrl(key, downloadName, 120),
		filename: downloadName,
		key,
		checksum: createHash("sha256").update(file).digest("hex"),
		// Every report this export covered, including one that wrote no booking
		// line — a report with no expenses, or none above 0,00, which `toBookings`
		// drops. The caller claims exactly what is named here, so naming only the
		// reports that reached the file would leave an empty one unclaimed and
		// therefore selectable again in every future period, for good: it is PAID
		// and so immutable, and no edit could ever give it a bookable row. Claimed
		// and reported instead — the caller's preflight raises a
		// `reportWithoutBookings` notice for it, so the admin is told which
		// reports were closed out without appearing in the Buchungsstapel.
		reportIds: rows.map((report) => report.id),
	};
}
