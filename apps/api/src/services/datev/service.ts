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

/** A setting that is present but empty is no setting at all. */
function isPresent(value: string | null): value is string {
	return value !== null && value.trim() !== "";
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

	/**
	 * `Report.paidAt` is nullable in the schema but set on every transition into
	 * PAID, and only PAID reports are selected. Refusing beats defaulting: every
	 * booking in the file is dated by this value, so a missing one would silently
	 * date a whole report to today.
	 */
	const paidAtOrRefuse = (report: {
		tag: number;
		paidAt: Date | null;
	}): Date => {
		if (!report.paidAt) {
			throw Object.assign(
				new Error(`Report ${report.tag} is paid but carries no payment date`),
				{ status: 409 },
			);
		}
		return report.paidAt;
	};

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

	const reports: ExportableReport[] = rows.map((report) => ({
		tag: report.tag,
		title: report.title,
		paidAt: paidAtOrRefuse(report),
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
			// Derived from the period, not taken as stored: the setting carries the
			// month and day a fiscal year starts on, and its year is whichever one
			// it was first entered in. Writing that year verbatim would book every
			// TTMM Belegdatum into it. The caller's preflight blocks a period that
			// crosses a boundary, so one derived year covers the whole file.
			wirtschaftsjahrBeginn: fiscalYearStartFor(
				request.periodFrom,
				settings.datevWirtschaftsjahrBeginn,
			),
			sachkontenlaenge: settings.datevSachkontenlaenge,
			datumVon: request.periodFrom,
			datumBis: request.periodTo,
			bezeichnung: "Spesen",
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
