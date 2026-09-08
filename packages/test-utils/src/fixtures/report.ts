import type { Report } from "@zemio/db";

export function createReportFixture(overrides?: Partial<Report>): Report {
	return {
		id: "report_1",
		tag: 1,
		title: "Conference trip",
		description: null,
		status: "DRAFT",
		paidAt: null,
		organizationId: "org_1",
		costUnitId: "cost_unit_1",
		ownerId: "user_1",
		bankingDetailsId: null,
		datevExportId: null,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		lastUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}
