import { createMockDb } from "@zemio/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStripeEvent, type WebhookDependencies } from "./billing.webhook";

// The trial-ending warning sends mail. Stubbed so these tests exercise the
// webhook rather than the emailer, which has its own.
const sendTrialEnding = vi.fn().mockResolvedValue({ ok: true, messageIds: [] });
vi.mock("@/server/email", () => ({
	getEmailer: () => ({ sendTrialEnding }),
	absoluteUrl: (path: string) => `https://zemio.test${path}`,
	logSend: () => {},
}));

/** A Stripe price carrying valid Zemio tier metadata. */
function price(overrides: Record<string, unknown> = {}) {
	return {
		id: "price_m",
		active: true,
		currency: "eur",
		unit_amount: 1900,
		recurring: { interval: "month", interval_count: 1 },
		metadata: { zemio_tier: "M", zemio_seats: "25" },
		...overrides,
	};
}

/** 2027-01-15T00:00:00Z, as Stripe reports period ends: unix seconds. */
const PERIOD_END = 1_800_000_000;

/** The subscription as the Stripe API returns it on re-fetch. */
function stripeSubscription(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub_1",
		customer: "cus_1",
		status: "active",
		cancel_at_period_end: false,
		// The period end lives on the item, not the subscription, in the API
		// version this SDK pins.
		items: { data: [{ current_period_end: PERIOD_END, price: price() }] },
		...overrides,
	};
}

function subscriptionEvent(type: string, object: Record<string, unknown> = {}) {
	return {
		id: "evt_1",
		type,
		data: { object: { id: "sub_1", ...object } },
	} as never;
}

function checkoutEvent(object: Record<string, unknown> = {}) {
	return {
		id: "evt_1",
		type: "checkout.session.completed",
		data: { object: { id: "cs_1", subscription: "sub_1", ...object } },
	} as never;
}

function deps(
	args: {
		subscription?: Record<string, unknown>;
		organizationId?: string | null;
		updatedRows?: number;
		eventAlreadyProcessed?: boolean;
		claimLostRace?: boolean;
		currentSubscription?: { stripeSubscriptionId: string; status: string };
	} = {},
) {
	const db = createMockDb();

	// The claim and the writes it guards share one transaction, so the mock runs
	// the callback against the same client the assertions read.
	db.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
		fn(db)) as never);

	db.processedStripeEvent.findUnique.mockResolvedValue(
		(args.eventAlreadyProcessed ? { id: "evt_1" } : null) as never,
	);
	db.processedStripeEvent.create.mockImplementation((() => {
		if (args.claimLostRace) {
			return Promise.reject(
				Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
			);
		}
		return Promise.resolve({} as never);
	}) as never);

	db.organization.findUnique.mockResolvedValue(
		(args.organizationId === null
			? null
			: { id: args.organizationId ?? "org_1" }) as never,
	);
	db.subscription.findUnique.mockResolvedValue(
		(args.currentSubscription ?? null) as never,
	);
	db.subscription.upsert.mockResolvedValue({} as never);
	db.subscription.updateMany.mockResolvedValue({
		count: args.updatedRows ?? 1,
	} as never);

	const retrieve = vi
		.fn()
		.mockResolvedValue(stripeSubscription(args.subscription));

	return {
		db,
		stripe: { subscriptions: { retrieve } },
		retrieve,
	} as unknown as WebhookDependencies & {
		db: ReturnType<typeof createMockDb>;
		retrieve: ReturnType<typeof vi.fn>;
	};
}

const SUBSCRIPTION_EVENTS = [
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
];

beforeEach(() => {
	vi.restoreAllMocks();
});

describe("handleStripeEvent idempotency", () => {
	it("records the event as part of applying it", async () => {
		const d = deps();

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.updated"),
		);

		expect(d.db.processedStripeEvent.create).toHaveBeenCalledWith({
			data: { id: "evt_1", type: "customer.subscription.updated" },
		});
	});

	it("claims the event in the same transaction as the state it writes", async () => {
		const d = deps();

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.updated"),
		);

		// Both writes must be inside one transaction, so a failure between them
		// cannot leave an event marked handled that was never applied — Stripe
		// reuses the event id, so nothing could repair that afterwards.
		expect(d.db.$transaction).toHaveBeenCalledOnce();
		expect(d.db.processedStripeEvent.create).toHaveBeenCalled();
		expect(d.db.subscription.upsert).toHaveBeenCalled();
	});

	it("treats a redelivered event as already handled and changes nothing", async () => {
		const d = deps({ eventAlreadyProcessed: true });

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).resolves.toBe("duplicate");

		expect(d.retrieve).not.toHaveBeenCalled();
		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});

	it("treats a redelivery that races the claim as already handled", async () => {
		// The pre-check missed it, so the unique constraint is what decides.
		const d = deps({ claimLostRace: true });

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).resolves.toBe("duplicate");

		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});

	it("claims nothing when the re-fetch fails, so the redelivery retries it", async () => {
		const d = deps();
		d.retrieve.mockRejectedValue(new Error("stripe is down"));

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).rejects.toThrow("stripe is down");

		expect(d.db.processedStripeEvent.create).not.toHaveBeenCalled();
	});

	it("lets a failed write out so the transaction rolls the claim back", async () => {
		const d = deps();
		d.db.subscription.upsert.mockRejectedValue(
			new Error("database is down") as never,
		);

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).rejects.toThrow("database is down");
	});

	it("does not mistake a write conflict for a redelivery", async () => {
		// A unique violation from the *state* write is a real failure. Reporting
		// it as a duplicate would answer Stripe 200 and drop the event for good.
		const d = deps();
		d.db.subscription.upsert.mockRejectedValue(
			Object.assign(new Error("Unique constraint failed"), {
				code: "P2002",
			}) as never,
		);

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).rejects.toThrow("Unique constraint failed");
	});
});

describe("handleStripeEvent when a subscription has been superseded", () => {
	it("ignores a terminal event for a subscription the organization has replaced", async () => {
		const d = deps({
			subscription: { id: "sub_old", status: "incomplete_expired" },
			currentSubscription: {
				stripeSubscriptionId: "sub_new",
				status: "active",
			},
		});

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.deleted")),
		).resolves.toBe("ignored");

		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});

	it("applies a terminal event for the subscription actually on record", async () => {
		const d = deps({
			subscription: { id: "sub_1", status: "canceled" },
			currentSubscription: { stripeSubscriptionId: "sub_1", status: "active" },
		});

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.deleted")),
		).resolves.toBe("processed");

		expect(d.db.subscription.upsert).toHaveBeenCalled();
	});

	it("adopts a live subscription that replaces the one on record", async () => {
		const d = deps({
			subscription: { id: "sub_new", status: "active" },
			currentSubscription: {
				stripeSubscriptionId: "sub_old",
				status: "canceled",
			},
		});

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.created")),
		).resolves.toBe("processed");

		expect(d.db.subscription.upsert).toHaveBeenCalled();
	});
});

describe("handleStripeEvent subscription lifecycle", () => {
	it.each(SUBSCRIPTION_EVENTS)("updates local state on %s", async (type) => {
		const d = deps();

		await expect(handleStripeEvent(d, subscriptionEvent(type))).resolves.toBe(
			"processed",
		);

		expect(d.db.subscription.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ where: { organizationId: "org_1" } }),
		);
	});

	it("updates local state on checkout completion", async () => {
		const d = deps();

		await expect(handleStripeEvent(d, checkoutEvent())).resolves.toBe(
			"processed",
		);

		// The session names its subscription but reports nothing about it, so
		// everything on the row has to come from the re-fetch. This is the event
		// that first creates the row for an organization: if it only recorded the
		// event, the organization would stay unsubscribed after paying.
		expect(d.retrieve).toHaveBeenCalledWith("sub_1");
		const written = d.db.subscription.upsert.mock.calls[0]?.[0] as
			| { where: Record<string, unknown>; create: Record<string, unknown> }
			| undefined;
		expect(written?.where).toEqual({ organizationId: "org_1" });
		expect(written?.create).toEqual({
			organizationId: "org_1",
			stripeSubscriptionId: "sub_1",
			stripePriceId: "price_m",
			tier: "M",
			seatLimit: 25,
			status: "active",
			currentPeriodEnd: new Date(PERIOD_END * 1000),
			cancelAtPeriodEnd: false,
		});
	});

	it("writes the subscription facts Stripe reported", async () => {
		const d = deps();

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.created"),
		);

		const written = d.db.subscription.upsert.mock.calls[0]?.[0] as {
			create: Record<string, unknown>;
			update: Record<string, unknown>;
		};
		expect(written.create).toEqual({
			organizationId: "org_1",
			stripeSubscriptionId: "sub_1",
			stripePriceId: "price_m",
			tier: "M",
			seatLimit: 25,
			status: "active",
			currentPeriodEnd: new Date(PERIOD_END * 1000),
			cancelAtPeriodEnd: false,
		});
		expect(written.update).toMatchObject({ status: "active", tier: "M" });
	});

	it("carries a cancellation scheduled for the period end", async () => {
		const d = deps({
			subscription: { cancel_at_period_end: true, status: "active" },
		});

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.updated"),
		);

		expect(d.db.subscription.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				update: expect.objectContaining({ cancelAtPeriodEnd: true }),
			}),
		);
	});

	it("ignores an event type it does not handle", async () => {
		const d = deps();

		await expect(
			handleStripeEvent(d, subscriptionEvent("invoice.payment_succeeded")),
		).resolves.toBe("ignored");

		expect(d.retrieve).not.toHaveBeenCalled();
		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});
});

describe("handleStripeEvent re-fetches rather than trusting the payload", () => {
	it("writes what the API returned, not what the event carried", async () => {
		const d = deps({ subscription: { status: "active" } });

		// A delayed `updated` event carrying older state than Stripe now holds.
		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.updated", {
				status: "past_due",
				cancel_at_period_end: true,
				items: {
					data: [{ current_period_end: 1, price: price({ id: "price_stale" }) }],
				},
			}),
		);

		expect(d.retrieve).toHaveBeenCalledWith("sub_1");
		expect(d.db.subscription.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				update: expect.objectContaining({
					status: "active",
					stripePriceId: "price_m",
					cancelAtPeriodEnd: false,
				}),
			}),
		);
	});
});

describe("handleStripeEvent tier resolution", () => {
	it("copies the tier and seat limit off the price metadata", async () => {
		const d = deps({
			subscription: {
				items: {
					data: [
						{
							current_period_end: PERIOD_END,
							price: price({
								id: "price_xl_acme",
								metadata: { zemio_tier: "XL Acme", zemio_seats: "400" },
							}),
						},
					],
				},
			},
		});

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.updated"),
		);

		expect(d.db.subscription.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					tier: "XL Acme",
					seatLimit: 400,
					stripePriceId: "price_xl_acme",
				}),
			}),
		);
	});

	it("reads the tier off the tiered item, not whichever Stripe listed first", async () => {
		const d = deps({
			subscription: {
				items: {
					data: [
						{
							current_period_end: PERIOD_END,
							price: price({ id: "price_addon", metadata: {} }),
						},
						{ current_period_end: PERIOD_END, price: price() },
					],
				},
			},
		});

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.updated"),
		);

		expect(d.db.subscription.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ tier: "M", stripePriceId: "price_m" }),
			}),
		);
	});

	it("keeps the tier already on record when the price lost its metadata", async () => {
		const d = deps({
			subscription: {
				items: {
					data: [{ current_period_end: PERIOD_END, price: price({ metadata: {} }) }],
				},
			},
		});

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).resolves.toBe("processed");

		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
		const [call] = d.db.subscription.updateMany.mock.calls;
		expect(call?.[0]).toMatchObject({
			where: { organizationId: "org_1" },
			data: { status: "active" },
		});
		expect(call?.[0]).not.toHaveProperty("data.tier");
	});

	it("invents no tier for an untagged price with nothing on record", async () => {
		const d = deps({
			subscription: {
				items: {
					data: [{ current_period_end: PERIOD_END, price: price({ metadata: {} }) }],
				},
			},
			updatedRows: 0,
		});

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).resolves.toBe("ignored");

		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});
});

describe("handleStripeEvent unrecognised subjects", () => {
	it("ignores an event for a customer belonging to no organization", async () => {
		const d = deps({ organizationId: null });

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).resolves.toBe("ignored");

		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});

	it("ignores a checkout that started no subscription", async () => {
		const d = deps();

		await expect(
			handleStripeEvent(d, checkoutEvent({ subscription: null })),
		).resolves.toBe("ignored");

		expect(d.retrieve).not.toHaveBeenCalled();
	});

	it("ignores a subscription with no items to read a price from", async () => {
		const d = deps({ subscription: { items: { data: [] } } });

		await expect(
			handleStripeEvent(d, subscriptionEvent("customer.subscription.updated")),
		).resolves.toBe("ignored");

		expect(d.db.subscription.upsert).not.toHaveBeenCalled();
	});
});

describe("handleStripeEvent: a trial about to end", () => {
	function trialDeps() {
		const d = deps({ subscription: { status: "trialing" } });

		// One mock serves the customer lookup and the owner lookup both.
		d.db.organization.findUnique.mockResolvedValue({
			id: "org_1",
			name: "Robotics Society",
			members: [{ user: { email: "owner@uni.de" } }],
		} as never);

		return d;
	}

	it("acts on the event rather than ignoring it", async () => {
		// Unhandled, a card-less trial simply stops: the organization goes
		// read-only mid-report having been told nothing.
		const d = trialDeps();

		await expect(
			handleStripeEvent(
				d,
				subscriptionEvent("customer.subscription.trial_will_end"),
			),
		).resolves.toBe("processed");

		expect(d.retrieve).toHaveBeenCalledWith("sub_1");
	});

	it("records the subscription's state like any other subscription event", async () => {
		const d = trialDeps();

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.trial_will_end"),
		);

		expect(d.db.subscription.upsert).toHaveBeenCalled();
	});

	it("warns the organization's owner", async () => {
		const d = trialDeps();

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.trial_will_end"),
		);

		expect(sendTrialEnding).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "owner@uni.de",
				organizationName: "Robotics Society",
			}),
		);
	});

	it("does not warn twice when Stripe redelivers the event", async () => {
		const d = trialDeps();

		await handleStripeEvent(
			d,
			subscriptionEvent("customer.subscription.trial_will_end"),
		);
		sendTrialEnding.mockClear();

		d.db.processedStripeEvent.findUnique.mockResolvedValue({
			id: "evt_1",
		} as never);

		await expect(
			handleStripeEvent(
				d,
				subscriptionEvent("customer.subscription.trial_will_end"),
			),
		).resolves.toBe("duplicate");
		expect(sendTrialEnding).not.toHaveBeenCalled();
	});
});
