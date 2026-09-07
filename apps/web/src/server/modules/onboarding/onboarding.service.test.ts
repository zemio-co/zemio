import { createMockDb, expectTRPCErrorCode } from "@zemio/test-utils";
import { describe, expect, it } from "vitest";
import { completeOnboarding } from "./onboarding.service";

/** A user row as {@link completeOnboarding} reads it. */
function userRow(
	overrides: {
		name?: string;
		emailVerified?: boolean;
		onboardingCompletedAt?: Date | null;
		members?: { role: string }[];
	} = {},
) {
	return {
		name: overrides.name ?? "Alex Braun",
		emailVerified: overrides.emailVerified ?? true,
		onboardingCompletedAt: overrides.onboardingCompletedAt ?? null,
		members: overrides.members ?? [{ role: "owner" }],
	};
}

function mockDb(row: ReturnType<typeof userRow> | null) {
	const db = createMockDb();
	db.user.findUnique.mockResolvedValue(row as never);
	db.user.updateMany.mockResolvedValue({ count: 1 } as never);

	return db;
}

describe("completeOnboarding", () => {
	it("records the founder who has walked the tail", async () => {
		const db = mockDb(userRow());

		await completeOnboarding(db, "user_1");

		expect(db.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user_1", onboardingCompletedAt: null },
			data: { onboardingCompletedAt: expect.any(Date) },
		});
	});

	it("refuses somebody who still owes an earlier step", async () => {
		// The stamp outranks every other fact, so accepting this report would
		// carry an unverified, nameless account straight into the application.
		const db = mockDb(userRow({ emailVerified: false, name: "" }));

		await expectTRPCErrorCode(completeOnboarding(db, "user_1"), "FORBIDDEN");
		expect(db.user.updateMany).not.toHaveBeenCalled();
	});

	it("refuses somebody who is in nobody's organization", async () => {
		const db = mockDb(userRow({ members: [] }));

		await expectTRPCErrorCode(completeOnboarding(db, "user_1"), "FORBIDDEN");
		expect(db.user.updateMany).not.toHaveBeenCalled();
	});

	it("refuses a member who never owned the organization", async () => {
		// Their flow ends at the organization step, and the resolver has already
		// recognised it. There is no tail for them to report walking.
		const db = mockDb(userRow({ members: [{ role: "member" }] }));

		await expectTRPCErrorCode(completeOnboarding(db, "user_1"), "FORBIDDEN");
		expect(db.user.updateMany).not.toHaveBeenCalled();
	});

	it("is idempotent for a flow already recorded", async () => {
		// A double-submitted Continue is not a mistake worth an error message.
		const db = mockDb(
			userRow({ onboardingCompletedAt: new Date("2026-01-01T00:00:00Z") }),
		);

		await expect(completeOnboarding(db, "user_1")).resolves.toBeUndefined();
		expect(db.user.updateMany).not.toHaveBeenCalled();
	});

	it("records nothing for a session with no user row behind it", async () => {
		const db = mockDb(null);

		await expect(completeOnboarding(db, "user_1")).resolves.toBeUndefined();
		expect(db.user.updateMany).not.toHaveBeenCalled();
	});
});
