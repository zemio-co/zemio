import { createMockDb } from "@zemio/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
	db.organization.findUnique.mockResolvedValue({
		id: "org_1",
		name: "Robotics Society",
		stripeCustomerId: args.stripeCustomerId ?? "cus_1",
	} as never);
	db.organization.updateMany.mockResolvedValue({ count: 1 } as never);
	db.subscription.upsert.mockResolvedValue({} as never);

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
		);
	});

	it("names the organization on the subscription", async () => {
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.subscriptionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({ metadata: { organizationId: "org_1" } }),
		);
	});

	it("records the subscription rather than waiting for the webhook", async () => {
		// The organization is about to have enforcement switched on. Waiting for
		// `customer.subscription.created` to arrive would leave it with no
		// subscription row and therefore read-only for as long as that takes.
		const d = deps();

		await startTrial(d as never, { organizationId: "org_1" });

		expect(d.db.subscription.upsert).toHaveBeenCalledWith(
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
		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});
});
