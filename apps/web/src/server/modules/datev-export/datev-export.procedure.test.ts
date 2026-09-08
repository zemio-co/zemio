import { Prisma, ReportStatus } from "@zemio/db";
import {
	asTRPCContext,
	createMockOrgAdminContext,
	createMockOrgContext,
	expectTRPCErrorCode,
} from "@zemio/test-utils";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { datevExportRouter } from "@/server/api/routers/datev-export";
import { createCallerFactory } from "@/server/api/trpc";

const { storageMock } = vi.hoisted(() => ({
	storageMock: {
		getPresignedDownloadUrl: vi.fn(),
		deleteFilesFromStorage: vi.fn(),
	},
}));
vi.mock("@/server/storage", () => storageMock);

const createCaller = createCallerFactory(datevExportRouter);

const period = {
	periodFrom: new Date(Date.UTC(2026, 7, 1)),
	periodTo: new Date(Date.UTC(2026, 7, 31)),
};

const configuredSettings = {
	datevBeraternummer: 29098,
	datevMandantennummer: 55003,
	datevWirtschaftsjahrBeginn: new Date(Date.UTC(2026, 0, 1)),
	datevSachkontenlaenge: 4,
	datevKontenrahmen: "03",
	datevExpenseAccountReceipt: "4980",
	datevExpenseAccountTravel: "4670",
	datevExpenseAccountFood: "4664",
	datevContraAccount: "1200",
	datevFestschreibung: true,
};

function adminContext(user?: { name: string }) {
	const ctx = createMockOrgAdminContext({ user });
	ctx.db.settings.findUnique.mockResolvedValue(configuredSettings as never);
	ctx.db.report.findMany.mockResolvedValue([] as never);
	return ctx;
}

/** Two reports that between them write two bookings. */
const bookableReports = [
	{
		id: "report_1",
		tag: 42,
		costUnit: { tag: "MARKETING" },
		expenses: [{ amount: new Prisma.Decimal("24.90") }],
	},
	{
		id: "report_2",
		tag: 43,
		costUnit: { tag: "MARKETING" },
		expenses: [{ amount: new Prisma.Decimal("10.00") }],
	},
];

/** What apps/api answers once it has written and stored the file. */
const storedFile = {
	url: "https://storage.test/datev/org_1/file.csv?signature",
	filename: "EXTF_Buchungsstapel_20260801-20260831.csv",
	key: "datev/org_1/2f6c.csv",
	checksum: "b8f1",
	reportIds: ["report_1", "report_2"],
};

/**
 * A context whose period holds two bookable reports and whose `$transaction`
 * runs its callback, so `recordExport` reaches the two writes it makes.
 */
function exportingContext(user?: { name: string }) {
	const ctx = adminContext(user);
	ctx.db.report.findMany.mockResolvedValue(bookableReports as never);
	(ctx.db.$transaction as unknown as Mock).mockImplementation(
		async (run: (tx: unknown) => unknown) => run(ctx.db),
	);
	ctx.db.datevExport.create.mockResolvedValue({ id: "dx_1" } as never);
	ctx.db.report.updateMany.mockResolvedValue({ count: 2 } as never);
	return ctx;
}

/** Stubs the call to apps/api that produces the file. */
function apiResponds(body: unknown, status = 200) {
	return vi.spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		}),
	);
}

beforeEach(() => {
	storageMock.getPresignedDownloadUrl.mockReset();
	storageMock.deleteFilesFromStorage.mockReset();
	storageMock.deleteFilesFromStorage.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("datevExport.preview", () => {
	it("is closed to members who are not admins", async () => {
		// Exports carry banking-relevant data out of the organization; the same
		// people who review and pay reports are the ones who may export them.
		const ctx = createMockOrgContext({ member: { role: "member" } });

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).preview(period),
			// The code orgAdminProcedure uses repo-wide for an insufficient role.
			"UNAUTHORIZED",
		);
	});

	it("offers only paid reports inside the period that were never exported", async () => {
		// The three conditions together are the no-double-export rule: a report
		// that already carries a datevExportId is never offered again.
		const ctx = adminContext();

		await createCaller(asTRPCContext(ctx)).preview(period);

		expect(ctx.db.report.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					organizationId: "org_1",
					status: ReportStatus.PAID,
					paidAt: {
						gte: period.periodFrom,
						// Held open at the start of the next day, so the whole of 31
						// August counts. `lte: periodTo` compares against midnight and
						// would drop every report paid during the last day of the
						// period — and no later period would pick them up either.
						lt: new Date(Date.UTC(2026, 8, 1)),
					},
					datevExportId: null,
				},
			}),
		);
	});

	it("counts a report paid during the last day of the period", async () => {
		const ctx = adminContext();

		await createCaller(asTRPCContext(ctx)).preview(period);

		const { where } = ctx.db.report.findMany.mock.calls[0]?.[0] as {
			where: { paidAt: { gte: Date; lt: Date } };
		};
		const lastMoment = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999));

		expect(lastMoment >= where.paidAt.gte).toBe(true);
		expect(lastMoment < where.paidAt.lt).toBe(true);
	});

	it("counts what the period would export", async () => {
		const ctx = adminContext();
		ctx.db.report.findMany.mockResolvedValue([
			{
				id: "report_1",
				tag: 42,
				costUnit: { tag: "MARKETING" },
				expenses: [
					{
						amount: new Prisma.Decimal("24.90"),
					},
				],
			},
			{
				id: "report_2",
				tag: 43,
				costUnit: { tag: "MARKETING" },
				expenses: [
					{
						amount: new Prisma.Decimal("10.00"),
					},
				],
			},
		] as never);

		const preview = await createCaller(asTRPCContext(ctx)).preview(period);

		expect(preview.reportCount).toBe(2);
		expect(preview.bookingCount).toBe(2);
		expect(preview.blockers).toEqual([]);
	});

	it("reports zero bookings for a period whose reports carry only 0,00", async () => {
		// The number that decides whether `create` writes a file at all. Without
		// it the preview says two exportable reports and the export then returns
		// "empty", with nothing to explain the difference.
		const ctx = adminContext();
		ctx.db.report.findMany.mockResolvedValue([
			{
				id: "report_1",
				tag: 42,
				costUnit: { tag: "MARKETING" },
				expenses: [
					{
						amount: new Prisma.Decimal("0.00"),
					},
				],
			},
		] as never);

		const preview = await createCaller(asTRPCContext(ctx)).preview(period);

		expect(preview.reportCount).toBe(1);
		expect(preview.bookingCount).toBe(0);
		// Both notices, in the order the preflight emits them: the skipped row,
		// and the report left with nothing to book. The second is what tells the
		// admin the report will be claimed without appearing in the file.
		expect(preview.notices).toEqual([
			{ kind: "zeroAmountSkipped", reportTag: 42, count: 1 },
			{ kind: "reportWithoutBookings", reportTag: 42 },
		]);
	});

	it("passes the preflight blockers through instead of an opaque failure", async () => {
		const ctx = adminContext();
		ctx.db.settings.findUnique.mockResolvedValue({
			...configuredSettings,
			datevContraAccount: null,
		} as never);

		const preview = await createCaller(asTRPCContext(ctx)).preview(period);

		expect(preview.blockers).toEqual([
			{ kind: "missingConfiguration", fields: ["contraAccount"] },
		]);
	});
});

describe("datevExport.list", () => {
	it("is closed to members who are not admins", async () => {
		const ctx = createMockOrgContext({ member: { role: "member" } });

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).list(),
			// The code orgAdminProcedure uses repo-wide for an insufficient role.
			"UNAUTHORIZED",
		);
	});

	it("asks only for the caller's own organization, newest first", async () => {
		const ctx = adminContext();
		ctx.db.datevExport.findMany.mockResolvedValue([] as never);

		await createCaller(asTRPCContext(ctx)).list();

		expect(ctx.db.datevExport.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { organizationId: "org_1" },
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("reports who exported the period, and how many reports it took", async () => {
		// The two values the history row is for. Both are read out of nested
		// shapes — `createdBy.name` and `_count.reports` — so a select that stopped
		// asking for either would leave the column blank rather than fail, and the
		// list is the only place a past export can still be recognized.
		const ctx = adminContext();
		ctx.db.datevExport.findMany.mockResolvedValue([
			{
				id: "dx_1",
				createdAt: new Date(Date.UTC(2026, 8, 2, 9, 30)),
				periodFrom: period.periodFrom,
				periodTo: period.periodTo,
				checksum: "b8f1",
				createdBy: { name: "Alex Admin" },
				_count: { reports: 7 },
			},
		] as never);

		const exports = await createCaller(asTRPCContext(ctx)).list();

		expect(exports).toEqual([
			{
				id: "dx_1",
				createdAt: new Date(Date.UTC(2026, 8, 2, 9, 30)),
				periodFrom: period.periodFrom,
				periodTo: period.periodTo,
				createdByName: "Alex Admin",
				reportCount: 7,
				checksum: "b8f1",
			},
		]);
	});

	it("does not carry the storage key out to the client", async () => {
		// The row holds one, and a history list has no use for it: the client asks
		// `download` for a fresh signed URL by export id instead.
		const ctx = adminContext();
		ctx.db.datevExport.findMany.mockResolvedValue([] as never);

		await createCaller(asTRPCContext(ctx)).list();

		const { select } = ctx.db.datevExport.findMany.mock.calls[0]?.[0] as {
			select: Record<string, unknown>;
		};

		expect(select).not.toHaveProperty("fileKey");
	});
});

describe("datevExport.download", () => {
	it("is closed to members who are not admins", async () => {
		const ctx = createMockOrgContext({ member: { role: "member" } });

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).download({ id: "dx_1" }),
			"UNAUTHORIZED",
		);
	});

	it("will not hand over an export belonging to another organization", async () => {
		// The id comes from the client, so the organization has to be part of the
		// lookup — a stored file is a whole period of one tenant's bookings.
		const ctx = adminContext();
		ctx.db.datevExport.findFirst.mockResolvedValue(null as never);

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).download({ id: "dx_other_org" }),
			"NOT_FOUND",
		);

		expect(ctx.db.datevExport.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "dx_other_org", organizationId: "org_1" },
			}),
		);
	});

	it("signs the stored file, and names it after the period it covers", async () => {
		// The file is served again rather than rebuilt: rebuilding would run
		// today's serializer over reports that are already claimed. The download
		// name therefore comes from the stored period and not from the key, so a
		// file the Kanzlei has already filed away cannot reappear under another
		// name. A part-month period is used here because it names both ends —
		// a whole month collapses to `202608` and would not show that.
		const ctx = adminContext();
		ctx.db.datevExport.findFirst.mockResolvedValue({
			id: "dx_1",
			fileKey: "datev/org_1/2f6c.csv",
			periodFrom: new Date(Date.UTC(2026, 7, 1)),
			periodTo: new Date(Date.UTC(2026, 7, 15)),
		} as never);
		storageMock.getPresignedDownloadUrl.mockResolvedValue(
			"https://storage.test/signed",
		);

		const result = await createCaller(asTRPCContext(ctx)).download({
			id: "dx_1",
		});

		expect(result).toEqual({
			url: "https://storage.test/signed",
			filename: "EXTF_Buchungsstapel_20260801-20260815.csv",
		});
		expect(storageMock.getPresignedDownloadUrl).toHaveBeenCalledWith(
			"datev/org_1/2f6c.csv",
			"EXTF_Buchungsstapel_20260801-20260815.csv",
		);
	});

	it("does not rebuild the file, and claims nothing further", async () => {
		// A second export of a period that is already closed out would claim
		// nothing and produce nothing; `download` must stay a read.
		const ctx = adminContext();
		ctx.db.datevExport.findFirst.mockResolvedValue({
			id: "dx_1",
			fileKey: "datev/org_1/2f6c.csv",
			periodFrom: period.periodFrom,
			periodTo: period.periodTo,
		} as never);
		storageMock.getPresignedDownloadUrl.mockResolvedValue(
			"https://storage.test/signed",
		);
		const fetchMock = vi.spyOn(globalThis, "fetch");

		await createCaller(asTRPCContext(ctx)).download({ id: "dx_1" });

		expect(fetchMock).not.toHaveBeenCalled();
		expect(ctx.db.report.updateMany).not.toHaveBeenCalled();
		expect(ctx.db.datevExport.create).not.toHaveBeenCalled();
	});
});

describe("datevExport.create", () => {
	it("is closed to members who are not admins", async () => {
		const ctx = createMockOrgContext({ member: { role: "member" } });

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			// The code orgAdminProcedure uses repo-wide for an insufficient role.
			"UNAUTHORIZED",
		);
	});

	it("refuses to build a file while a blocker stands", async () => {
		// Reported rather than thrown, so the UI can name the missing field
		// instead of showing "export failed".
		const ctx = adminContext();
		ctx.db.settings.findUnique.mockResolvedValue({
			...configuredSettings,
			datevKontenrahmen: null,
		} as never);

		const result = await createCaller(asTRPCContext(ctx)).create(period);

		expect(result).toEqual({
			status: "blocked",
			blockers: [{ kind: "missingConfiguration", fields: ["kontenrahmen"] }],
		});
	});

	it("refuses an empty period rather than writing a file with no bookings", async () => {
		const ctx = adminContext();

		const result = await createCaller(asTRPCContext(ctx)).create(period);

		expect(result.status).toBe("empty");
	});

	it("refuses a period whose reports would write no booking at all", async () => {
		// DATEV rejects an Umsatz of 0,00, so such an expense writes no row.
		// Counting reports instead of rows would hand over a file holding a header
		// and nothing else — and claim the reports for it permanently, which for
		// a PAID report can only be undone by deleting the export.
		const ctx = adminContext();
		ctx.db.report.findMany.mockResolvedValue([
			{
				id: "report_1",
				tag: 42,
				costUnit: { tag: "MARKETING" },
				expenses: [
					{
						amount: new Prisma.Decimal("0.00"),
					},
				],
			},
		] as never);

		const result = await createCaller(asTRPCContext(ctx)).create(period);

		expect(result.status).toBe("empty");
		expect(ctx.db.datevExport.create).not.toHaveBeenCalled();
	});

	it("records the export and claims exactly the reports the file covered", async () => {
		const ctx = exportingContext();
		apiResponds(storedFile);

		const result = await createCaller(asTRPCContext(ctx)).create(period);

		expect(result).toEqual({
			status: "created",
			url: storedFile.url,
			filename: storedFile.filename,
			reportCount: 2,
			notices: [],
		});
		// The ids come from apps/api's answer, not from a second query over the
		// period: a report that turned PAID in between is in neither the file nor
		// the claim.
		expect(ctx.db.report.updateMany).toHaveBeenCalledWith({
			where: {
				id: { in: storedFile.reportIds },
				organizationId: "org_1",
				datevExportId: null,
			},
			data: { datevExportId: "dx_1" },
		});
	});

	it("names the preflighted selection to apps/api rather than the period alone", async () => {
		const ctx = exportingContext();
		const fetchMock = apiResponds(storedFile);

		await createCaller(asTRPCContext(ctx)).create(period);

		const [, init] = fetchMock.mock.calls[0] ?? [];
		expect(JSON.parse(String(init?.body))).toEqual({
			periodFrom: period.periodFrom.toISOString(),
			periodTo: period.periodTo.toISOString(),
			reportIds: ["report_1", "report_2"],
			exportiertVon: "TestUser",
		});
	});

	it("writes the exporter's name into the file, not their id", async () => {
		// Header field 9 is where the Kanzlei reads who produced a file. A cuid
		// there answers nobody's question, and the field takes only
		// `[A-Za-z0-9_]{0,25}` — so the name is folded before it travels.
		const ctx = exportingContext({ name: "Jürgen Müller-Weiß" });
		const fetchMock = apiResponds(storedFile);

		await createCaller(asTRPCContext(ctx)).create(period);

		const [, init] = fetchMock.mock.calls[0] ?? [];
		expect(JSON.parse(String(init?.body)).exportiertVon).toBe(
			"JuergenMuellerWeiss",
		);
	});

	it("stores the configuration the export was approved with", async () => {
		// Without it an export stops being explainable the moment an organization
		// edits an account. `festschreibung` rides along because it is written into
		// the header, and the fiscal-year start as an ISO string because JSON has
		// no date.
		const ctx = exportingContext();
		apiResponds(storedFile);

		await createCaller(asTRPCContext(ctx)).create(period);

		const { data } = ctx.db.datevExport.create.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};

		expect(data.configuration).toEqual({
			beraternummer: 29098,
			mandantennummer: 55003,
			wirtschaftsjahrBeginn: "2026-01-01T00:00:00.000Z",
			sachkontenlaenge: 4,
			kontenrahmen: "03",
			expenseAccountReceipt: "4980",
			expenseAccountTravel: "4670",
			expenseAccountFood: "4664",
			contraAccount: "1200",
			festschreibung: true,
		});
		expect(data.fileKey).toBe(storedFile.key);
		expect(data.checksum).toBe(storedFile.checksum);
	});

	it("refuses the file when another export claimed part of the selection", async () => {
		// `recordExport` is all-or-nothing: the file was written for the whole
		// selection, so handing it over after claiming only part of it would repeat
		// bookings the Kanzlei already has.
		const ctx = exportingContext();
		ctx.db.report.updateMany.mockResolvedValue({ count: 1 } as never);
		apiResponds(storedFile);

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			"CONFLICT",
		);
	});

	it("drops the stored file when it refuses to record the export", async () => {
		// The object is in storage and no row will point at it — `recordExport`
		// rolled back — and the file is only ever served again from its row, so
		// nothing could rediscover it. Left alone it would hold a full copy of a
		// period's bookings for good.
		const ctx = exportingContext();
		ctx.db.report.updateMany.mockResolvedValue({ count: 1 } as never);
		apiResponds(storedFile);

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			"CONFLICT",
		);

		expect(storageMock.deleteFilesFromStorage).toHaveBeenCalledWith([
			storedFile.key,
		]);
	});

	it("keeps the conflict when the stored file cannot be dropped", async () => {
		// A storage failure must not replace the conflict: the admin retries and
		// gets whatever is genuinely left, and the orphan is already logged.
		const ctx = exportingContext();
		ctx.db.report.updateMany.mockResolvedValue({ count: 1 } as never);
		storageMock.deleteFilesFromStorage.mockRejectedValue(new Error("S3 down"));
		apiResponds(storedFile);

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			"CONFLICT",
		);
	});

	it("leaves the stored file alone when the failure is not a claim conflict", async () => {
		// Any other failure leaves the outcome of the commit unknown, and an
		// orphaned object is the lesser harm next to deleting a file a recorded
		// export points at.
		const ctx = exportingContext();
		(ctx.db.$transaction as unknown as Mock).mockRejectedValue(
			new Error("connection lost"),
		);
		apiResponds(storedFile);

		await expect(
			createCaller(asTRPCContext(ctx)).create(period),
		).rejects.toThrow();

		expect(storageMock.deleteFilesFromStorage).not.toHaveBeenCalled();
	});

	it("refuses a file whose whole selection was claimed while it was written", async () => {
		// Only an apps/api old enough to upload before re-querying answers this
		// way, with a header and no bookings. Its file has to go too.
		const ctx = exportingContext();
		apiResponds({ ...storedFile, reportIds: [] });

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			"CONFLICT",
		);

		expect(ctx.db.datevExport.create).not.toHaveBeenCalled();
		expect(storageMock.deleteFilesFromStorage).toHaveBeenCalledWith([
			storedFile.key,
		]);
	});

	it("reads apps/api's 409 as a conflict, not as a fault of ours", async () => {
		// The one failure apps/api reports that is not a bug: it found the
		// configuration incomplete after the preflight had passed it, so the
		// settings changed in between.
		const ctx = exportingContext();
		apiResponds({ error: "DATEV configuration incomplete" }, 409);

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			"CONFLICT",
		);

		expect(ctx.db.datevExport.create).not.toHaveBeenCalled();
	});

	it("reads any other apps/api failure as ours", async () => {
		const ctx = exportingContext();
		apiResponds({ error: "boom" }, 500);

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).create(period),
			"INTERNAL_SERVER_ERROR",
		);

		expect(ctx.db.datevExport.create).not.toHaveBeenCalled();
	});
});

describe("the period a DATEV export is addressed by", () => {
	it("takes a single UTC day", async () => {
		// `periodFrom === periodTo` is a legitimate period: the query widens
		// `periodTo` to the end of its UTC day, so it selects exactly that day.
		const ctx = adminContext();
		const day = new Date(Date.UTC(2026, 7, 14));

		await createCaller(asTRPCContext(ctx)).preview({
			periodFrom: day,
			periodTo: day,
		});

		const { where } = ctx.db.report.findMany.mock.calls[0]?.[0] as {
			where: { paidAt: { gte: Date; lt: Date } };
		};

		expect(where.paidAt.gte).toEqual(day);
		expect(where.paidAt.lt).toEqual(new Date(Date.UTC(2026, 7, 15)));
	});

	it("refuses a period that runs backwards", async () => {
		const ctx = adminContext();

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).preview({
				periodFrom: period.periodTo,
				periodTo: period.periodFrom,
			}),
			"BAD_REQUEST",
		);

		expect(ctx.db.report.findMany).not.toHaveBeenCalled();
	});

	it("refuses a day that is not a UTC midnight", async () => {
		// A `Date` carrying a time of day is almost always a local midnight, and
		// west of UTC that names the previous day — silently shifting the
		// selection, the header's `Datum von`/`Datum bis` and every `TTMM`
		// Belegdatum with it. Nothing downstream can tell it from a deliberate
		// period, so it is refused where it arrives.
		const ctx = adminContext();

		await expectTRPCErrorCode(
			createCaller(asTRPCContext(ctx)).preview({
				periodFrom: new Date(Date.UTC(2026, 7, 1, 22, 0)),
				periodTo: period.periodTo,
			}),
			"BAD_REQUEST",
		);

		expect(ctx.db.report.findMany).not.toHaveBeenCalled();
	});
});
