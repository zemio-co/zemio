import { createMockDb, expectTRPCErrorCode } from "@zemio/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createSelfServeOrganization } from "./organization.self-serve-service";

function deps(
	args: {
		emailVerified?: boolean;
		/** Whether this person's one trial is already claimed. */
		trialSpent?: boolean;
		slugTaken?: boolean;
		trial?: { subscriptionId: string; status: string } | null;
		startTrialThrows?: boolean;
	} = {},
) {
	const db = createMockDb();
	db.user.findUnique.mockResolvedValue({
		emailVerified: args.emailVerified ?? true,
	} as never);
	// The claim is a conditional update: it matches the person only while their
	// trial is unclaimed. The release that may follow reuses the same mock.
	db.user.updateMany.mockResolvedValue({
		count: args.trialSpent ? 0 : 1,
	} as never);
	db.organization.findFirst.mockResolvedValue(
		(args.slugTaken ? { id: "org_other" } : null) as never,
	);
	db.organization.updateMany.mockResolvedValue({ count: 1 } as never);
	db.user.update.mockResolvedValue({} as never);

	const createOrganization = vi.fn().mockResolvedValue({ id: "org_new" });
	const startTrial = args.startTrialThrows
		? vi.fn().mockRejectedValue(new Error("stripe is down"))
		: vi
				.fn()
				.mockResolvedValue(
					args.trial === undefined
						? { subscriptionId: "sub_1", status: "trialing" }
						: args.trial,
				);

	return { db, createOrganization, startTrial };
}

describe("createSelfServeOrganization", () => {
	it("creates the organization and reports it", async () => {
		const d = deps();

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });

		expect(d.createOrganization).toHaveBeenCalledWith({
			name: "Robotics",
			slug: "robotics",
			userId: "user_1",
		});
	});

	it("refuses an unverified address", async () => {
		const d = deps({ emailVerified: false });

		await expectTRPCErrorCode(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
			"FORBIDDEN",
		);
		expect(d.createOrganization).not.toHaveBeenCalled();
	});

	it("creates another organization once the person's trial is spent", async () => {
		// Somebody genuinely running two initiatives is not turned away.
		const d = deps({ trialSpent: true });

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });
	});

	it("gives that organization no trial", async () => {
		// One trial per person, ever: a second organization must not renew it.
		const d = deps({ trialSpent: true });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.startTrial).not.toHaveBeenCalled();
	});

	it("leaves that organization unentitled, so it can subscribe", async () => {
		// Read-only from the start and deliberately so: a state its owner can
		// see and act on, unlike a trial that failed to start (ADR-0009).
		const d = deps({ trialSpent: true });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.db.organization.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "org_new" },
				data: { billingEnforced: true },
			}),
		);
	});

	it("gives the organization a distinct slug when the obvious one is taken", async () => {
		// Two initiatives called Robotics is ordinary. Refusing the second one a
		// name it never chose is not something to make a person solve.
		const d = deps({ slugTaken: true });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		const slug = d.createOrganization.mock.calls[0]?.[0].slug;
		expect(slug).toMatch(/^robotics-[a-z0-9]+$/);
	});

	it("starts the trial, which is what switches enforcement on", async () => {
		// Enforcement moves with the subscription row inside startTrial, so
		// this path must not switch it on separately — doing both would risk
		// enforcing an organization whose trial never started.
		const d = deps();

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.startTrial).toHaveBeenCalledWith("org_new");
		expect(d.db.organization.updateMany).not.toHaveBeenCalled();
	});

	it("leaves a working organization when no trial could be started", async () => {
		// Billing switched off, or no price tagged as the trial tier. Switching
		// enforcement on here would hand somebody a brand-new organization that
		// is read-only on arrival for a reason they cannot see or fix.
		const d = deps({ trial: null });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.db.organization.updateMany).not.toHaveBeenCalled();
	});

	it("leaves a working organization when the billing provider fails", async () => {
		const d = deps({ startTrialThrows: true });

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });

		expect(d.db.organization.updateMany).not.toHaveBeenCalled();
	});

	it("opens the new organization at the next login", async () => {
		const d = deps();

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.db.user.update).toHaveBeenCalledWith({
			where: { id: "user_1" },
			data: { lastActiveOrganizationId: "org_new" },
		});
	});
});

describe("createSelfServeOrganization: the person's one trial", () => {
	const CLAIM = {
		where: { id: "user_1", trialClaimedAt: null },
		data: { trialClaimedAt: expect.any(Date) },
	};

	it("claims the trial with a conditional update before starting it", async () => {
		// Two organizations created at once both read "no trial yet" if this
		// were a read; exactly one conditional update matches.
		const d = deps();

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.db.user.updateMany).toHaveBeenNthCalledWith(1, CLAIM);
		expect(d.db.user.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
			d.startTrial.mock.invocationCallOrder[0] ?? 0,
		);
	});

	it("keeps the claim once the trial started", async () => {
		const d = deps();

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.db.user.updateMany).toHaveBeenCalledTimes(1);
	});

	it("hands the trial back when none could be started", async () => {
		// Billing off or no tagged price is not the person having had a trial.
		const d = deps({ trial: null });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		const claimedAt = d.db.user.updateMany.mock.calls[0]?.[0]?.data
			?.trialClaimedAt as Date;
		expect(d.db.user.updateMany).toHaveBeenLastCalledWith({
			where: { id: "user_1", trialClaimedAt: claimedAt },
			data: { trialClaimedAt: null },
		});
	});

	it("hands the trial back when the billing provider fails", async () => {
		const d = deps({ startTrialThrows: true });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.db.user.updateMany).toHaveBeenLastCalledWith(
			expect.objectContaining({ data: { trialClaimedAt: null } }),
		);
	});

	it("does not fail creation when handing the trial back fails", async () => {
		const d = deps({ trial: null });
		d.db.user.updateMany
			.mockResolvedValueOnce({ count: 1 } as never)
			.mockRejectedValueOnce(new Error("write conflict"));

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });
	});
});

describe("createSelfServeOrganization under concurrency", () => {
	it("retries with a distinct slug when someone else took it first", async () => {
		// Two people creating "Robotics" at the same moment both see the slug
		// free. The loser must not be handed an error about a name they never
		// chose.
		const d = deps();
		d.createOrganization
			.mockRejectedValueOnce(
				Object.assign(new Error("Organization already exists"), {
					body: { code: "ORGANIZATION_ALREADY_EXISTS" },
				}),
			)
			.mockResolvedValueOnce({ id: "org_new" });

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });

		expect(d.createOrganization).toHaveBeenCalledTimes(2);
		const [first, second] = d.createOrganization.mock.calls;
		expect(second?.[0].slug).not.toBe(first?.[0].slug);
		expect(second?.[0].slug).toMatch(/^robotics-[a-z0-9]+$/);
	});

	it("retries when the loser of the race failed on the unique constraint", async () => {
		// Both passed Better Auth's own check; the loser's insert then failed on
		// the slug's unique key with the adapter's error, not Better Auth's code.
		// The slug is now held by an organization this person is not in.
		const d = deps();
		d.createOrganization
			.mockRejectedValueOnce(new Error("Unique constraint failed on slug"))
			.mockResolvedValueOnce({ id: "org_new" });
		d.db.organization.findFirst
			.mockResolvedValueOnce(null) // the availability check: free
			.mockResolvedValueOnce({ members: [] } as never); // after: someone else's

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });

		expect(d.createOrganization).toHaveBeenCalledTimes(2);
		expect(d.createOrganization.mock.calls[1]?.[0].slug).toMatch(
			/^robotics-[a-z0-9]+$/,
		);
	});

	it("does not retry when the organization holding the slug is the person's own", async () => {
		// This attempt got as far as creating it. Asking again would leave them
		// with two organizations after an error saying they have none.
		const d = deps();
		d.createOrganization.mockRejectedValue(new Error("member insert failed"));
		d.db.organization.findFirst
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ members: [{ id: "member_1" }] } as never);

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).rejects.toThrow("member insert failed");

		expect(d.createOrganization).toHaveBeenCalledTimes(1);
	});

	it("reports a creation that failed for any other reason, without retrying", async () => {
		// Asking again under a different name fixes nothing here, reports the
		// second failure in place of the real one, and risks a second
		// organization if the first attempt partly succeeded.
		const d = deps();
		d.createOrganization.mockRejectedValue(new Error("database is down"));

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).rejects.toThrow("database is down");

		expect(d.createOrganization).toHaveBeenCalledTimes(1);
	});

	it("does not fail creation when remembering the organization fails", async () => {
		// The organization exists and its trial has started; reporting failure
		// here would have them create a second one.
		const d = deps();
		d.db.user.update.mockRejectedValue(new Error("write conflict"));

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });
	});
});
