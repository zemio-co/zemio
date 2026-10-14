import { createMockDb, type MockPrismaClient } from "@zemio/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { isHeldByUnprovenAccount } from "./unproven-account";

let db: MockPrismaClient;

beforeEach(() => {
	db = createMockDb();
});

describe("isHeldByUnprovenAccount", () => {
	it("asks for an unverified user on the address that has a linked account", async () => {
		db.user.findFirst.mockResolvedValue(null);

		await isHeldByUnprovenAccount(db, "victim@example.org");

		expect(db.user.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					email: "victim@example.org",
					emailVerified: false,
					accounts: { some: {} },
				},
			}),
		);
	});

	it("matches the address the way Better Auth stores it, in lower case", async () => {
		db.user.findFirst.mockResolvedValue(null);

		await isHeldByUnprovenAccount(db, "Victim@Example.org");

		expect(db.user.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ email: "victim@example.org" }),
			}),
		);
	});

	it("answers true when such a user exists", async () => {
		db.user.findFirst.mockResolvedValue({ id: "user_1" } as never);

		await expect(isHeldByUnprovenAccount(db, "victim@example.org")).resolves.toBe(
			true,
		);
	});

	it("answers false when none does", async () => {
		// No user, a verified user, or an unverified user with no linked
		// account — a magic-link sign-up creates no account row — all read the
		// same, and the magic link is let through.
		db.user.findFirst.mockResolvedValue(null);

		await expect(isHeldByUnprovenAccount(db, "victim@example.org")).resolves.toBe(
			false,
		);
	});
});
