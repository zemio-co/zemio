import { ExpenseType, InputTaxRate, Prisma, ReportStatus } from "@zemio/db";
import { createMockDb, type MockPrismaClient } from "@zemio/test-utils";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { AuditRepository } from "@/server/modules/audit";
import type { ExpenseDetail, ExpenseRepository } from "./expense.repository";
import { createExpenseService } from "./expense.service";

function expenseDetail(overrides?: Partial<ExpenseDetail>): ExpenseDetail {
	return {
		id: "expense_1",
		reportId: "report_1",
		type: ExpenseType.RECEIPT,
		amount: new Prisma.Decimal("24.90"),
		description: "Kabeltrommel",
		startDate: new Date("2026-08-03T00:00:00Z"),
		endDate: new Date("2026-08-03T00:00:00Z"),
		inputTaxRate: InputTaxRate.STANDARD,
		meta: null,
		travelDetail: null,
		foodDetail: null,
		report: {
			ownerId: "user_1",
			organizationId: "org_1",
			status: ReportStatus.DRAFT,
		},
		...overrides,
	} as ExpenseDetail;
}

describe("expenseService.update", () => {
	let db: MockPrismaClient;
	let repo: ExpenseRepository;
	let audit: AuditRepository;

	beforeEach(() => {
		db = createMockDb();
		(db.$transaction as unknown as Mock).mockImplementation(
			async (run: (tx: unknown) => unknown) => run(db),
		);
		repo = {
			update: vi.fn().mockResolvedValue({ id: "expense_1" }),
		} as unknown as ExpenseRepository;
		audit = {
			append: vi.fn().mockResolvedValue(undefined),
		} as unknown as AuditRepository;
	});

	const ctx = () => ({
		db: db as never,
		organizationId: "org_1",
		userId: "user_1",
		isOrgAdmin: false,
	});

	it("records a corrected input tax rate in the audit diff", async () => {
		// The rate decides the BU-Schlüssel and therefore a deduction claimed in
		// the customer's name. A silent correction would leave the Kanzlei with an
		// export it cannot reconcile against anything.
		const service = createExpenseService({ repo, audit });

		await service.update(ctx(), expenseDetail(), {
			inputTaxRate: InputTaxRate.NONE,
		});

		expect(audit.append).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				action: "expense.updated",
				diff: {
					before: { inputTaxRate: InputTaxRate.STANDARD },
					after: { inputTaxRate: InputTaxRate.NONE },
				},
			}),
		);
	});

	it("leaves an allowance without an input tax rate", async () => {
		// Only a receipt carries an invoice that states one. The exporter ignores
		// the column for the two allowances, so a value written here would be a
		// claim nothing reads and nobody made.
		const service = createExpenseService({ repo, audit });

		await service.update(
			ctx(),
			expenseDetail({ type: ExpenseType.TRAVEL, inputTaxRate: null }),
			{ inputTaxRate: InputTaxRate.STANDARD },
		);

		expect(repo.update).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				data: expect.not.objectContaining({ inputTaxRate: expect.anything() }),
			}),
		);
	});
});
