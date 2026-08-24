import { createMockDb, expectTRPCErrorCode } from "@zemio/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createSelfServeOrganization } from "./organization.self-serve-service";

function deps(
	args: {
		emailVerified?: boolean;
		trialing?: number;
		slugTaken?: boolean;
		trial?: { subscriptionId: string; status: string } | null;
		startTrialThrows?: boolean;
	} = {},
) {
	const db = createMockDb();
	db.user.findUnique.mockResolvedValue({
		emailVerified: args.emailVerified ?? true,
	} as never);
	db.member.count.mockResolvedValue((args.trialing ?? 0) as never);
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

	it("creates a second organization while a trial is running", async () => {
		// Somebody genuinely running two initiatives is not turned away.
		const d = deps({ trialing: 1 });

		await expect(
			createSelfServeOrganization(d, { userId: "user_1" }, { name: "Robotics" }),
		).resolves.toEqual({ id: "org_new" });
	});

	it("gives that second organization no trial", async () => {
		const d = deps({ trialing: 1 });

		await createSelfServeOrganization(
			d,
			{ userId: "user_1" },
			{ name: "Robotics" },
		);

		expect(d.startTrial).not.toHaveBeenCalled();
	});

	it("leaves that second organization unentitled, so it can subscribe", async () => {
		// Read-only from the start and deliberately so: a state its owner can
		// see and act on, unlike a trial that failed to start (ADR-0009).
		const d = deps({ trialing: 1 });

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

	it("switches enforcement on only once the trial exists", async () => {
		const d = deps();

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
