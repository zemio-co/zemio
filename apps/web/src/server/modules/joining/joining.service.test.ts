import { createMockDb, type MockPrismaClient } from "@zemio/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import {
	applyAutoJoins,
	joinAfterVerification,
	openJoinedOrganization,
} from "./joining.service";

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

describe("openJoinedOrganization", () => {
	it("opens the person's organization in sessions that have none", async () => {
		db.user.findUnique.mockResolvedValue({
			lastActiveOrganizationId: null,
		} as never);
		db.member.findMany.mockResolvedValue([
			{ organizationId: "org_a", createdAt: new Date("2026-01-01") },
		] as never);

		await openJoinedOrganization(db, "user_1");

		// Only sessions and a remembered choice that are still empty: somebody
		// already working in an organization is never moved.
		expect(db.session.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_1", activeOrganizationId: null },
			data: { activeOrganizationId: "org_a" },
		});
		expect(db.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user_1", lastActiveOrganizationId: null },
			data: { lastActiveOrganizationId: "org_a" },
		});
		expect(db.$transaction).toHaveBeenCalledTimes(1);
	});

	it("writes nothing for somebody with no organization", async () => {
		db.user.findUnique.mockResolvedValue({
			lastActiveOrganizationId: null,
		} as never);
		db.member.findMany.mockResolvedValue([]);

		await openJoinedOrganization(db, "user_1");

		expect(db.$transaction).not.toHaveBeenCalled();
	});
});

describe("joinAfterVerification", () => {
	it("opens the organization even when a concurrent sign-in inserted the membership", async () => {
		// The race: verification committed `emailVerified`, a sign-in elsewhere
		// read it and joined first, so this call inserts nothing. The verifying
		// session still has no organization and must be given one.
		db.joiningRule.findMany.mockResolvedValue([domainRule("org_a")] as never);
		db.member.findMany
			.mockResolvedValueOnce([]) // memberships read before the insert
			.mockResolvedValueOnce([
				{ organizationId: "org_a", createdAt: new Date("2026-01-01") },
			] as never); // memberships read when choosing what to open
		db.member.createManyAndReturn.mockResolvedValue([]);
		db.user.findUnique.mockResolvedValue({
			lastActiveOrganizationId: null,
		} as never);

		await joinAfterVerification(db, "user_1", signals);

		expect(db.session.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_1", activeOrganizationId: null },
			data: { activeOrganizationId: "org_a" },
		});
	});

	it("opens nothing when no rule admits the person and they belong nowhere", async () => {
		db.joiningRule.findMany.mockResolvedValue([]);
		db.member.findMany.mockResolvedValue([]);
		db.user.findUnique.mockResolvedValue({
			lastActiveOrganizationId: null,
		} as never);

		await joinAfterVerification(db, "user_1", signals);

		expect(db.$transaction).not.toHaveBeenCalled();
	});
});
