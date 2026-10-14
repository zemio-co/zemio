import { createMockDb } from "@zemio/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { clearTierCatalogue } from "./billing.catalogue";
import { startTrial, TRIAL_PERIOD_DAYS } from "./billing.trial";

const TRIAL_PRICE = "price_s";

function price(overrides: Record<string, unknown> = {}) {
	return {
		id: TRIAL_PRICE,
		active: true,
		currency: "eur",
		unit_amount: 900,
		recurring: { interval: "month", interval_count: 1 },
		metadata: { zemio_tier: "S", zemio_seats: "10", zemio_trial: "true" },
		...overrides,
	};
}

function deps(
	args: {
		prices?: unknown[];
		stripeCustomerId?: string | null;
		subscription?: Record<string, unknown>;
	} = {},
) {
	const db = createMockDb();
	// The transaction hands its callback a client of its own, so a write that
	// lands on `tx` provably ran inside it and one on `db` provably did not.
	const tx = createMockDb();
	db.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
		fn(tx)) as never);
	db.organization.findUnique.mockResolvedValue({
		id: "org_1",
		name: "Robotics Society",
		stripeCustomerId: args.stripeCustomerId ?? "cus_1",
	} as never);
	tx.organization.updateMany.mockResolvedValue({ count: 1 } as never);
	tx.subscription.upsert.mockResolvedValue({} as never);

	const subscriptionsCreate = vi.fn().mockResolvedValue(
		args.subscription ?? {
			id: "sub_1",
			status: "trialing",
			cancel_at_period_end: false,
			items: {
				data: [{ price: price(), current_period_end: 1_800_000_000 }],
			},
		},
	);

	return {
		db,
		tx,
		stripe: {
			prices: {
				list: vi
					.fn()
					.mockResolvedValue({ data: args.prices ?? [price()], has_more: false }),
			},
			customers: { create: vi.fn(), del: vi.fn() },
			subscriptions: { create: subscriptionsCreate },
		},
		subscriptionsCreate,
	};
}

beforeEach(() => {
	clearTierCatalogue();
});

describe("startTrial", () => {
	it("starts a trial on the price tagged as the trial tier", async () => {
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.subscriptionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				customer: "cus_1",
				items: [{ price: TRIAL_PRICE, quantity: 1 }],
				trial_period_days: TRIAL_PERIOD_DAYS,
			}),
			expect.anything(),
		);
	});

	it("ends the trial by cancelling when no card was ever added", async () => {
		// The decision ADR-0009 exists for. `pause` maps to payment_failing and
		// is therefore still entitled, and its webhook is not handled either, so
		// the trial would expire into permanent free access.
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.subscriptionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				trial_settings: {
					end_behavior: { missing_payment_method: "cancel" },
				},
			}),
			expect.anything(),
		);
	});

	it("names the organization on the subscription and tags it as its trial", async () => {
		// The tag is what lets the webhook recognise the trial and switch
		// enforcement on if this call could not.
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.subscriptionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: { organizationId: "org_1", zemio_trial: "true" },
			}),
			expect.anything(),
		);
	});

	it("asks Stripe for one trial per organization, however often it is retried", async () => {
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.subscriptionsCreate).toHaveBeenCalledWith(expect.anything(), {
			idempotencyKey: "trial:org_1",
		});
	});

	it("reports the trial as started when recording it fails after Stripe created it", async () => {
		// The trial exists in Stripe. Throwing would tell the caller there is
		// none; the webhook records it and switches enforcement on instead.
		const d = deps();
		d.db.$transaction.mockRejectedValue(new Error("connection reset"));

		await expect(
			startTrial(d as never, { organizationId: "org_1" }),
		).resolves.toEqual({ subscriptionId: "sub_1", status: "trialing" });
	});

	it("records the subscription rather than waiting for the webhook", async () => {
		// The organization is about to have enforcement switched on. Waiting for
		// `customer.subscription.created` to arrive would leave it with no
		// subscription row and therefore read-only for as long as that takes.
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.tx.subscription.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { organizationId: "org_1" },
				create: expect.objectContaining({
					stripeSubscriptionId: "sub_1",
					stripePriceId: TRIAL_PRICE,
					status: "trialing",
					tier: "S",
					seatLimit: 10,
				}),
			}),
		);
	});

	it("switches enforcement on with the row, in the same transaction", async () => {
		// Two halves of one fact: Stripe is now billing this organization.
		// Enforced without a row is read-only on arrival; a row without
		// enforcement is free forever once Stripe cancels the trial. Both writes
		// must land on the transaction's client, and neither outside it.
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.tx.subscription.upsert).toHaveBeenCalled();
		expect(d.tx.organization.updateMany).toHaveBeenCalledWith({
			where: { id: "org_1" },
			data: { billingEnforced: true },
		});
		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
		expect(d.db.organization.updateMany).not.toHaveBeenCalled();
	});

	it("switches nothing on when there was no trial to start", async () => {
		const d = deps({
			prices: [price({ metadata: { zemio_tier: "S", zemio_seats: "10" } })],
		});

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.tx.organization.updateMany).not.toHaveBeenCalled();
		expect(d.db.organization.updateMany).not.toHaveBeenCalled();
	});

	it("reports the trial it started", async () => {
		const d = deps();

		await expect(
			startTrial(d as never, { organizationId: "org_1" }),
		).resolves.toEqual({ subscriptionId: "sub_1", status: "trialing" });
	});

	it("starts nothing when no price is tagged as the trial tier", async () => {
		const d = deps({
			prices: [price({ metadata: { zemio_tier: "S", zemio_seats: "10" } })],
		});

		await expect(
			startTrial(d as never, { organizationId: "org_1" }),
		).resolves.toBeNull();
		expect(d.subscriptionsCreate).not.toHaveBeenCalled();
	});

	it("never trials on a negotiated price, however it is tagged", async () => {
		// A deal negotiated for one organization is not something to hand the
		// next one that signs up.
		const d = deps({
			prices: [
				price({
					metadata: {
						zemio_tier: "XL",
						zemio_seats: "500",
						zemio_trial: "true",
						zemio_org: "org_other",
					},
				}),
			],
		});

		await expect(
			startTrial(d as never, { organizationId: "org_1" }),
		).resolves.toBeNull();
	});
});

describe("startTrial when the trial price is misconfigured", () => {
	/** Asserts no trial started, and the log names the mistake and its prices. */
	async function expectNotStarted(
		prices: unknown[],
		reason: string,
		priceIds: string[],
	) {
		const error = vi.spyOn(logger, "error").mockImplementation(() => {});
		const d = deps({ prices });

		await expect(
			startTrial(d as never, { organizationId: "org_1" }),
		).resolves.toBeNull();

		expect(d.subscriptionsCreate).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledWith("billing.trial_not_started", {
			organizationId: "org_1",
			reason,
			priceIds,
		});
		error.mockRestore();
	}

	it("says nothing is tagged when nothing is", async () => {
		await expectNotStarted(
			[price({ metadata: { zemio_tier: "S", zemio_seats: "10" } })],
			"none",
			[],
		);
	});

	it("refuses to choose between two tagged prices", async () => {
		// A monthly and a yearly price are not comparable by amount, and the
		// trial is billed on whichever is chosen once it ends (ADR-0009).
		await expectNotStarted(
			[
				price(),
				price({
					id: "price_s_year",
					unit_amount: 9000,
					recurring: { interval: "year", interval_count: 1 },
				}),
			],
			"ambiguous",
			[TRIAL_PRICE, "price_s_year"],
		);
	});

	it("counts a tagged price that is not a valid tier towards ambiguity", async () => {
		await expectNotStarted(
			[
				price(),
				price({
					id: "price_broken",
					metadata: { zemio_tier: "S", zemio_trial: "true" },
				}),
			],
			"ambiguous",
			[TRIAL_PRICE, "price_broken"],
		);
	});

	it("names a tagged price that is not a tier Zemio can sell", async () => {
		// Missing seats: dropped from the catalogue like any half-tagged price,
		// but reported as what it is rather than as "nothing tagged".
		await expectNotStarted(
			[price({ metadata: { zemio_tier: "S", zemio_trial: "true" } })],
			"invalid",
			[TRIAL_PRICE],
		);
	});

	it("names a tagged price negotiated for one organization", async () => {
		await expectNotStarted(
			[
				price({
					metadata: {
						zemio_tier: "XL",
						zemio_seats: "500",
						zemio_trial: "true",
						zemio_org: "org_other",
					},
				}),
			],
			"negotiated",
			[TRIAL_PRICE],
		);
	});
});

describe("startTrial when Stripe answers oddly", () => {
	it("reports no trial when the subscription came back with no items", async () => {
		// Nothing to record a tier or a period end from. Reporting a trial here
		// would have the caller switch enforcement on for an organization with
		// no subscription row — read-only on arrival, which is the one outcome
		// a new organization must never have (ADR-0009).
		const d = deps({
			subscription: {
				id: "sub_1",
				status: "trialing",
				cancel_at_period_end: false,
				items: { data: [] },
			},
		});

		await expect(
			startTrial(d as never, { organizationId: "org_1" }),
		).resolves.toBeNull();
		expect(d.tx.subscription.upsert).not.toHaveBeenCalled();
		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});
});
