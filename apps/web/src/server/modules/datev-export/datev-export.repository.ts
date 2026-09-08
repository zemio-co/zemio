import { type Prisma, type PrismaClient, ReportStatus } from "@zemio/db";

type Db = PrismaClient;

type SelectionArgs = {
	organizationId: string;
	periodFrom: Date;
	periodTo: Date;
};

const selectableReportSelect = {
	id: true,
	tag: true,
	costUnit: { select: { tag: true } },
	expenses: { select: { amount: true } },
} as const;

const startOfDayUtc = (date: Date) =>
	Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * The period as a `paidAt` filter.
 *
 * The period is a pair of calendar days; `paidAt` is an instant. Read in UTC,
 * because that is the calendar the rest of the export reads: DATEV's `Datum
 * von`/`Datum bis` and every `TTMM` Belegdatum are written from `getUTC*`.
 *
 * The upper bound is the start of the day *after* `periodTo`, held open. A
 * plain `lte: periodTo` compares against midnight and so drops every report
 * paid during the last day of the period — and nothing else would pick them up
 * afterwards: they are not in this export, and the next period starts later,
 * so they stay unexported until someone happens to choose a window that covers
 * that day again.
 */
function paidAtWithin(periodFrom: Date, periodTo: Date): Prisma.DateTimeFilter {
	return {
		gte: new Date(startOfDayUtc(periodFrom)),
		lt: new Date(startOfDayUtc(periodTo) + 24 * 60 * 60 * 1000),
	};
}

/**
 * Raised when part of the selection was already claimed by another export, so
 * the file just written would repeat bookings the Kanzlei has. Its own type
 * because the caller has to turn it into a conflict rather than a failure.
 */
export class ReportsAlreadyExportedError extends Error {
	constructor(
		readonly claimed: number,
		readonly expected: number,
	) {
		super(`Claimed ${claimed} of ${expected} reports`);
		this.name = "ReportsAlreadyExportedError";
	}
}

export const datevExportRepository = {
	/**
	 * The reports a period would export.
	 *
	 * The three conditions together are the no-double-export rule: paid (so the
	 * report can no longer change), paid inside the period, and not already
	 * carrying a `datevExportId`. A report leaves this set the moment it is
	 * written into an export, and comes back only if that export is deleted.
	 */
	selectableReports(db: Db, args: SelectionArgs) {
		return db.report.findMany({
			where: {
				organizationId: args.organizationId,
				status: ReportStatus.PAID,
				paidAt: paidAtWithin(args.periodFrom, args.periodTo),
				datevExportId: null,
			},
			select: selectableReportSelect,
			orderBy: { tag: "asc" },
		});
	},

	datevSettings(db: Db, organizationId: string) {
		return db.settings.findUnique({ where: { organizationId } });
	},

	/** Past exports of one organization, newest first. */
	listExports(db: Db, organizationId: string) {
		return db.datevExport.findMany({
			where: { organizationId },
			select: {
				id: true,
				createdAt: true,
				periodFrom: true,
				periodTo: true,
				checksum: true,
				createdBy: { select: { name: true } },
				_count: { select: { reports: true } },
			},
			orderBy: { createdAt: "desc" },
		});
	},

	/**
	 * One export, scoped to the organization asking for it. The id arrives from
	 * the client and the file behind it is a whole period of one tenant's
	 * bookings, so the organization is part of the lookup rather than a check
	 * afterwards.
	 */
	findExport(db: Db, args: { id: string; organizationId: string }) {
		return db.datevExport.findFirst({
			where: { id: args.id, organizationId: args.organizationId },
			select: { id: true, fileKey: true, periodFrom: true, periodTo: true },
		});
	},

	/**
	 * Records the export and claims its reports in one transaction.
	 *
	 * The `datevExportId: null` guard on the update is what makes the claim safe
	 * under concurrency: an export takes only the reports still unclaimed. It has
	 * to claim all of them, though — a file was already written for the full
	 * selection, so claiming part of it would leave the rest of that file
	 * duplicating an export someone else already handed over. Anything short of
	 * the whole selection rolls the transaction back.
	 */
	recordExport(
		db: Db,
		args: {
			organizationId: string;
			createdById: string;
			periodFrom: Date;
			periodTo: Date;
			configuration: Prisma.InputJsonValue;
			fileKey: string;
			checksum: string;
			reportIds: string[];
		},
	) {
		return db.$transaction(async (tx) => {
			const created = await tx.datevExport.create({
				data: {
					organizationId: args.organizationId,
					createdById: args.createdById,
					periodFrom: args.periodFrom,
					periodTo: args.periodTo,
					configuration: args.configuration,
					fileKey: args.fileKey,
					checksum: args.checksum,
				},
				select: { id: true },
			});

			const claimed = await tx.report.updateMany({
				// Scoped to the organization as well as the ids: the ids arrive in
				// apps/api's response, and the claim is the one place that decides
				// which rows this organization's export owns.
				where: {
					id: { in: args.reportIds },
					organizationId: args.organizationId,
					datevExportId: null,
				},
				data: { datevExportId: created.id },
			});

			if (claimed.count !== args.reportIds.length) {
				throw new ReportsAlreadyExportedError(claimed.count, args.reportIds.length);
			}

			return { id: created.id, claimedReports: claimed.count };
		});
	},
};

export type DatevExportRepository = typeof datevExportRepository;

export type SelectableReport = Awaited<
	ReturnType<typeof datevExportRepository.selectableReports>
>[number];
