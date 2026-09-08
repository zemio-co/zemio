import { Prisma, ReportStatus } from "@zemio/db";
import {
	asTRPCContext,
	createMockOrgAdminContext,
	createMockOrgContext,
	expectTRPCErrorCode,
} from "@zemio/test-utils";
import { describe, expect, it } from "vitest";
import { datevExportRouter } from "@/server/api/routers/datev-export";
import { createCallerFactory } from "@/server/api/trpc";

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

function adminContext() {
	const ctx = createMockOrgAdminContext();
	ctx.db.settings.findUnique.mockResolvedValue(configuredSettings as never);
	ctx.db.report.findMany.mockResolvedValue([] as never);
	return ctx;
}

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
});
