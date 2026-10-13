import { createMockDb, type MockPrismaClient } from "@zemio/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { applyAutoJoins } from "./joining.service";

let db: MockPrismaClient;

const signals = {
	email: "treasurer@initiative.org",
	emailVerified: true,
	microsoftTenantId: null,
};

function domainRule(organizationId: string) {
	return {
		organizationId,
		type: "EMAIL_DOMAIN",
		value: "initiative.org",
		mode: "AUTO_JOIN",
	};
}

beforeEach(() => {
	db = createMockDb();
	db.$transaction.mockResolvedValue([]);
});

describe("applyAutoJoins", () => {
	it("returns only the memberships this call inserted", async () => {
		// A concurrent sign-in inserted org_a first. The insert skips it, and
		// reporting it as joined here would log a membership this call did not
		// create.
		db.joiningRule.findMany.mockResolvedValue([
			domainRule("org_a"),
			domainRule("org_b"),
		] as never);
		db.member.findMany.mockResolvedValue([]);
		db.member.createManyAndReturn.mockResolvedValue([
			{ organizationId: "org_b" },
		] as never);

		await expect(applyAutoJoins(db, "user_1", signals)).resolves.toEqual([
			"org_b",
		]);
	});

	it("returns nothing when every row was inserted by somebody else", async () => {
		db.joiningRule.findMany.mockResolvedValue([domainRule("org_a")] as never);
		db.member.findMany.mockResolvedValue([]);
		db.member.createManyAndReturn.mockResolvedValue([]);

		await expect(applyAutoJoins(db, "user_1", signals)).resolves.toEqual([]);
	});

	it("inserts only organizations the person is not already in, skipping duplicates", async () => {
		db.joiningRule.findMany.mockResolvedValue([
			domainRule("org_a"),
			domainRule("org_b"),
		] as never);
		db.member.findMany.mockResolvedValue([{ organizationId: "org_a" }] as never);
		db.member.createManyAndReturn.mockResolvedValue([
			{ organizationId: "org_b" },
		] as never);

		await applyAutoJoins(db, "user_1", signals);

		const call = db.member.createManyAndReturn.mock.calls[0]?.[0];
		expect(call?.skipDuplicates).toBe(true);
		expect(call?.data).toEqual([
			expect.objectContaining({ userId: "user_1", organizationId: "org_b" }),
		]);
	});
});
