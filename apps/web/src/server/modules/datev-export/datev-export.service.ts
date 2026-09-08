import { TRPCError } from "@trpc/server";
import { buchungsstapelFilename, toKontenrahmen } from "@zemio/datev";
import type { Prisma, PrismaClient, Settings } from "@zemio/db";
import { env } from "@/env";
import { decimalToNumber } from "@/server/shared/money";
import {
	deleteFilesFromStorage,
	getPresignedDownloadUrl,
} from "@/server/storage";
import {
	checkExportPreconditions,
	countBookings,
	type DatevConfiguration,
	type PreflightBlocker,
	type PreflightNotice,
	type PreflightReport,
} from "./datev-export.preflight";
import {
	type DatevExportRepository,
	datevExportRepository,
	ReportsAlreadyExportedError,
	type SelectableReport,
} from "./datev-export.repository";
import type { DatevExportPeriodInput } from "./datev-export.validators";

/**
 * No `orgRole`: unlike the PDF services, apps/api is not asked to re-authorize
 * this call — `orgAdminProcedure` settles it and no role is forwarded — so
 * carrying one here would suggest a decision this service does not make.
 */
export type DatevExportServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
};

/** What a period would export, and what stands in the way. */
export type DatevExportPreviewDTO = {
	reportCount: number;
	/**
	 * Rows the file would hold. Reported next to `reportCount` because it is the
	 * number that decides whether `create` produces a file at all: a report whose
	 * every expense is 0,00 is selected and counted, yet writes nothing.
	 */
	bookingCount: number;
	blockers: PreflightBlocker[];
	notices: PreflightNotice[];
};

export type DatevExportResultDTO =
	| { status: "blocked"; blockers: PreflightBlocker[] }
	| { status: "empty" }
	| {
			status: "created";
			url: string;
			filename: string;
			reportCount: number;
			notices: PreflightNotice[];
	  };

/**
 * Raised when another export took the selection while this file was being
 * written, whether it took all of it or part.
 */
const alreadyExported = () =>
	new TRPCError({
		code: "CONFLICT",
		message: "These reports were exported by another export",
	});

/**
 * Drops the file apps/api has already stored, on the two paths that refuse to
 * record it.
 *
 * Nothing will ever reference the object: `recordExport` rolled its row back,
 * or was never reached. Left alone it would sit in storage for good holding a
 * full copy of a period's bookings — and since the file is only ever served
 * again from its row, not rebuilt, there is no path that could rediscover it.
 *
 * The conflict is what the admin has to see, so a failed delete must not
 * replace it; `deleteFilesFromStorage` has already logged it.
 */
async function discardStoredFile(key: string): Promise<void> {
	await deleteFilesFromStorage([key]).catch(() => undefined);
}

/** What apps/api returns once it has written the file. */
type BuchungsstapelResponse = {
	url: string;
	filename: string;
	key: string;
	checksum: string;
	reportIds: string[];
};

/**
 * Reads the DATEV settings off an organization's Settings row. A missing row is
 * the same as an unconfigured one — every field null — so the preflight names
 * the fields either way instead of failing on the absent row.
 */
function toConfiguration(settings: Settings | null): DatevConfiguration {
	return {
		beraternummer: settings?.datevBeraternummer ?? null,
		mandantennummer: settings?.datevMandantennummer ?? null,
		wirtschaftsjahrBeginn: settings?.datevWirtschaftsjahrBeginn ?? null,
		sachkontenlaenge: settings?.datevSachkontenlaenge ?? null,
		// An unexpected value reads as unconfigured, so the preflight names the
		// field instead of the header carrying one DATEV refuses the file over.
		kontenrahmen: toKontenrahmen(settings?.datevKontenrahmen),
		expenseAccountReceipt: settings?.datevExpenseAccountReceipt ?? null,
		expenseAccountTravel: settings?.datevExpenseAccountTravel ?? null,
		expenseAccountFood: settings?.datevExpenseAccountFood ?? null,
		contraAccount: settings?.datevContraAccount ?? null,
	};
}

/**
 * The configuration this export was authorized against, stored alongside it.
 * Without it an export stops being explainable the moment an organization edits
 * an account.
 *
 * `festschreibung` rides along even though it is not part of the preflight: it
 * is written into the header as field 21, so leaving it out would make the
 * snapshot explain everything about the file except whether its bookings are
 * locked.
 *
 * Not quite the configuration the file was *written* from, and the difference
 * is worth knowing: apps/api reads the settings row again before it serializes,
 * so an account edited between the preflight above and that read reaches the
 * Kanzlei while this snapshot still names the old one. apps/api's 409 catches
 * only an edit that leaves the configuration incomplete — 4980 to 4985 passes
 * both ends. Closing it means having apps/api return the configuration it used;
 * until then the file itself, addressed by `checksum`, is the authority and this
 * is what the export was approved with.
 */
function toConfigurationSnapshot(
	configuration: DatevConfiguration,
	festschreibung: boolean,
): Prisma.InputJsonValue {
	return {
		...configuration,
		wirtschaftsjahrBeginn:
			configuration.wirtschaftsjahrBeginn?.toISOString() ?? null,
		festschreibung,
	};
}

/** Decimal leaves the repository exactly once, here. */
function toPreflightReport(report: SelectableReport): PreflightReport {
	return {
		tag: report.tag,
		costUnitTag: report.costUnit.tag,
		expenses: report.expenses.map((expense) => ({
			amount: decimalToNumber(expense.amount),
		})),
	};
}

/** One past export, as the history list shows it. */
export type DatevExportListItemDTO = {
	id: string;
	createdAt: Date;
	periodFrom: Date;
	periodTo: Date;
	createdByName: string;
	reportCount: number;
	checksum: string;
};

export function createDatevExportService(deps: {
	repo: DatevExportRepository;
}) {
	const { repo } = deps;

	async function inspect(
		ctx: DatevExportServiceContext,
		input: DatevExportPeriodInput,
	) {
		const [settings, reports] = await Promise.all([
			repo.datevSettings(ctx.db, ctx.organizationId),
			repo.selectableReports(ctx.db, {
				organizationId: ctx.organizationId,
				...input,
			}),
		]);

		const configuration = toConfiguration(settings);
		const preflightReports = reports.map(toPreflightReport);
		const preflight = checkExportPreconditions({
			configuration,
			reports: preflightReports,
			...input,
		});

		return {
			reports,
			preflight,
			configuration,
			bookingCount: countBookings(preflightReports),
			// Mirrors the column default, for the same reason `toConfiguration`
			// tolerates a missing row: the preflight names the fields either way.
			festschreibung: settings?.datevFestschreibung ?? true,
		};
	}

	return {
		/**
		 * The organization's past exports.
		 *
		 * Exists because the file is the only copy: `create` hands over a short
		 * lived URL and irreversibly claims the reports it covered, so without a
		 * way back to a stored export a missed click would strand the file and its
		 * reports together.
		 */
		async list(
			ctx: DatevExportServiceContext,
		): Promise<DatevExportListItemDTO[]> {
			const exports = await repo.listExports(ctx.db, ctx.organizationId);

			return exports.map((row) => ({
				id: row.id,
				createdAt: row.createdAt,
				periodFrom: row.periodFrom,
				periodTo: row.periodTo,
				createdByName: row.createdBy.name,
				reportCount: row._count.reports,
				checksum: row.checksum,
			}));
		},

		/**
		 * A fresh download link for a stored export.
		 *
		 * The stored file is served again rather than rebuilt: rebuilding would run
		 * today's serializer over reports that are already claimed, and a later
		 * change to it — or to DATEV's yearly format version — would hand the
		 * Kanzlei a different file under the same name.
		 */
		async download(
			ctx: DatevExportServiceContext,
			input: { id: string },
		): Promise<{ url: string; filename: string }> {
			const record = await repo.findExport(ctx.db, {
				id: input.id,
				organizationId: ctx.organizationId,
			});

			if (!record) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Export not found" });
			}

			const filename = buchungsstapelFilename(record.periodFrom, record.periodTo);

			return {
				url: await getPresignedDownloadUrl(record.fileKey, filename),
				filename,
			};
		},

		async preview(
			ctx: DatevExportServiceContext,
			input: DatevExportPeriodInput,
		): Promise<DatevExportPreviewDTO> {
			const { reports, preflight, bookingCount } = await inspect(ctx, input);

			return {
				reportCount: reports.length,
				bookingCount,
				blockers: preflight.blockers,
				notices: preflight.notices,
			};
		},

		async create(
			ctx: DatevExportServiceContext,
			input: DatevExportPeriodInput,
		): Promise<DatevExportResultDTO> {
			const { reports, preflight, configuration, festschreibung, bookingCount } =
				await inspect(ctx, input);

			// Returned rather than thrown: the UI has to name the missing field, and
			// a message stuffed into an error string cannot carry that.
			if (preflight.blockers.length > 0) {
				return { status: "blocked", blockers: preflight.blockers };
			}

			// Counted in bookings, not in reports: a zero-amount expense is dropped
			// from the file, so a period whose reports carry nothing else would
			// otherwise claim those reports for a file holding no bookings at all.
			if (bookingCount === 0) {
				return { status: "empty" };
			}

			// apps/api owns file production: it holds the storage credentials and the
			// upload path, the same split exportToPdf uses.
			const response = await fetch(`${env.API_URL}/datev/buchungsstapel`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Service-Key": env.INTERNAL_API_SECRET,
					"X-Organization-Id": ctx.organizationId,
					"X-Exported-By": ctx.userId,
				},
				body: JSON.stringify({
					periodFrom: input.periodFrom.toISOString(),
					periodTo: input.periodTo.toISOString(),
					// The selection the preflight above passed, named explicitly: a
					// second query over the period would pick up a report that turned
					// PAID since, and nothing would have checked its cost unit or its
					// expense dates.
					reportIds: reports.map((report) => report.id),
				}),
			});

			if (!response.ok) {
				const body: unknown = await response.json().catch(() => ({}));
				throw new TRPCError({
					// 409 is the one failure apps/api reports that is not a fault: it
					// found the configuration incomplete after the preflight above had
					// passed it, so someone edited the settings in between. Mapped to a
					// conflict, like the concurrency path, rather than to the 500 that
					// would tell the admin to report a bug.
					code: response.status === 409 ? "CONFLICT" : "INTERNAL_SERVER_ERROR",
					message:
						typeof body === "object" && body !== null && "error" in body
							? String((body as { error: unknown }).error)
							: "DATEV export failed",
				});
			}

			const file = (await response.json()) as BuchungsstapelResponse;

			// The whole selection was claimed while the file was being written, so
			// what came back is a header with no bookings. Only an apps/api old
			// enough to upload before re-querying can answer this way; it still has
			// to be handled, and its file still has to be dropped.
			if (file.reportIds.length === 0) {
				await discardStoredFile(file.key);
				throw alreadyExported();
			}

			// Written after the file exists: an export row without a file would look
			// like a period already handled, and hide those reports from the next one.
			const recorded = await repo
				.recordExport(ctx.db, {
					organizationId: ctx.organizationId,
					createdById: ctx.userId,
					periodFrom: input.periodFrom,
					periodTo: input.periodTo,
					configuration: toConfigurationSnapshot(configuration, festschreibung),
					fileKey: file.key,
					checksum: file.checksum,
					reportIds: file.reportIds,
				})
				.catch(async (error: unknown) => {
					// Another export claimed part of this selection while the file was
					// being written. The file repeats bookings that already went to the
					// Kanzlei, so it is withheld rather than handed over; the admin
					// retries and gets whatever is genuinely left.
					//
					// Only this error is known to have rolled the transaction back —
					// `recordExport` raised it itself, from inside the callback. Any
					// other failure leaves the outcome of the commit unknown, and an
					// orphaned object is the lesser harm next to deleting a file a
					// recorded export points at.
					if (error instanceof ReportsAlreadyExportedError) {
						await discardStoredFile(file.key);
						throw alreadyExported();
					}
					throw error;
				});

			return {
				status: "created",
				url: file.url,
				filename: file.filename,
				reportCount: recorded.claimedReports,
				notices: preflight.notices,
			};
		},
	};
}

export const datevExportService = createDatevExportService({
	repo: datevExportRepository,
});
export type DatevExportService = ReturnType<typeof createDatevExportService>;
