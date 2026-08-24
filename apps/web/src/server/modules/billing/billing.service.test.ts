import { createMockDb } from "@zemio/test-utils";
import { describe, expect, it } from "vitest";
import { getBillingStatus, isOrganizationEntitled } from "./billing.service";

const enabledConfig = {
	enabled: true,
	secretKey: "sk_test_1",
	webhookSecret: "whsec_1",
} as const;

const PERIOD_END = new Date("2027-01-15T00:00:00.000Z");

type SubscriptionRow = {
	tier: string;
	seatLimit: number;
	status: string;
	currentPeriodEnd?: Date;
	cancelAtPeriodEnd?: boolean;
};

function dbWith(args: {
	billingEnforced?: boolean;
	subscription?: SubscriptionRow | null;
	seats?: number;
}) {
	const db = createMockDb();
	db.organization.findUnique.mockResolvedValue({
		billingEnforced: args.billingEnforced ?? true,
		subscription: args.subscription
			? {
					currentPeriodEnd: PERIOD_END,
					cancelAtPeriodEnd: false,
					...args.subscription,
				}
			: null,
	} as never);
	db.member.count.mockResolvedValue((args.seats ?? 0) as never);
	return db;
}

describe("getBillingStatus when billing is off", () => {
	it("reports billing as disabled and the organization as entitled", async () => {
		const db = dbWith({});

		await expect(
			getBillingStatus({ db, config: { enabled: false } }, "org_1"),
		).resolves.toEqual({ enabled: false, entitled: true });
	});

	it("reads no organization state at all", async () => {
		const db = dbWith({});

		await getBillingStatus({ db, config: { enabled: false } }, "org_1");

		expect(db.organization.findUnique).not.toHaveBeenCalled();
		expect(db.member.count).not.toHaveBeenCalled();
	});
});

describe("getBillingStatus with a subscription", () => {
	it("reports the tier, seat limit, seat count and entitlement state", async () => {
		const db = dbWith({
			subscription: { tier: "M", seatLimit: 25, status: "active" },
			seats: 12,
		});

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_1"),
		).resolves.toEqual({
			enabled: true,
			entitled: true,
			enforced: true,
			state: "entitled",
			tier: "M",
			seatLimit: 25,
			seatCount: 12,
			overSeatLimit: false,
			trialing: false,
			currentPeriodEnd: PERIOD_END,
			cancelAtPeriodEnd: false,
		});
	});

	it("reports an over-limit organization as over limit and still entitled", async () => {
		const db = dbWith({
			subscription: { tier: "S", seatLimit: 10, status: "active" },
			seats: 400,
		});

		const status = await getBillingStatus({ db, config: enabledConfig }, "org_1");

		expect(status).toMatchObject({
			overSeatLimit: true,
			entitled: true,
			state: "entitled",
			seatCount: 400,
		});
	});

	it("flags a failing payment without withdrawing entitlement", async () => {
		const db = dbWith({
			subscription: { tier: "M", seatLimit: 25, status: "past_due" },
			seats: 5,
		});

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_1"),
		).resolves.toMatchObject({ state: "payment_failing", entitled: true });
	});

	it("makes a lapsed organization read-only", async () => {
		const db = dbWith({
			subscription: { tier: "M", seatLimit: 25, status: "canceled" },
			seats: 5,
		});

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_1"),
		).resolves.toMatchObject({ state: "read_only", entitled: false });
	});
});

describe("getBillingStatus enforcement override", () => {
	it("entitles an organization not opted into enforcement, with no subscription", async () => {
		const db = dbWith({ billingEnforced: false, subscription: null, seats: 3 });

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_1"),
		).resolves.toMatchObject({
			entitled: true,
			state: "entitled",
			tier: null,
			seatLimit: null,
			seatCount: 3,
		});
	});

	it("reports that enforcement does not apply, so the interface can stay quiet", async () => {
		// `state` alone cannot carry this: it reads "entitled" both for an
		// organization nothing is enforced against and for one with a healthy
		// subscription. The banner has to tell those apart to stay silent during
		// a staged rollout, even for an organization over its seats.
		const db = dbWith({
			billingEnforced: false,
			subscription: { tier: "S", seatLimit: 10, status: "canceled" },
			seats: 400,
		});

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_1"),
		).resolves.toMatchObject({
			enforced: false,
			state: "entitled",
			overSeatLimit: true,
		});
	});

	it("makes an enforced organization with no subscription read-only", async () => {
		const db = dbWith({ billingEnforced: true, subscription: null, seats: 3 });

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_1"),
		).resolves.toMatchObject({ entitled: false, state: "read_only" });
	});
});

describe("isOrganizationEntitled", () => {
	it("agrees with the status surface, so the gate and the banner cannot differ", async () => {
		for (const status of ["active", "trialing", "past_due", "paused"]) {
			const db = dbWith({ subscription: { tier: "M", seatLimit: 25, status } });

			await expect(
				isOrganizationEntitled({ db, config: enabledConfig }, "org_1"),
			).resolves.toBe(true);
		}

		for (const status of ["canceled", "unpaid", "incomplete_expired"]) {
			const db = dbWith({ subscription: { tier: "M", seatLimit: 25, status } });

			await expect(
				isOrganizationEntitled({ db, config: enabledConfig }, "org_1"),
			).resolves.toBe(false);
		}
	});

	it("counts no seats, since seats never decide entitlement", async () => {
		const db = dbWith({
			subscription: { tier: "S", seatLimit: 10, status: "active" },
			seats: 400,
		});

		await expect(
			isOrganizationEntitled({ db, config: enabledConfig }, "org_1"),
		).resolves.toBe(true);
		expect(db.member.count).not.toHaveBeenCalled();
	});

	it("reads nothing at all with billing switched off", async () => {
		const db = dbWith({});

		await expect(
			isOrganizationEntitled({ db, config: { enabled: false } }, "org_1"),
		).resolves.toBe(true);
		expect(db.organization.findUnique).not.toHaveBeenCalled();
	});
});

describe("getBillingStatus exposure", () => {
	it("leaks no Stripe credentials into the status", async () => {
		const db = dbWith({
			subscription: { tier: "M", seatLimit: 25, status: "active" },
		});

		const status = await getBillingStatus({ db, config: enabledConfig }, "org_1");

		expect(JSON.stringify(status)).not.toContain("sk_test_1");
		expect(JSON.stringify(status)).not.toContain("whsec_1");
	});

	it("enforces nothing against a missing organization rather than crashing", async () => {
		// A membership that resolved against an organization now gone is a race.
		// Refusing it for a billing reason would be a lockout it has no
		// subscription to fix; whatever the caller was doing raises its own,
		// accurate NOT_FOUND instead (ADR-0001).
		const db = createMockDb();
		db.organization.findUnique.mockResolvedValue(null as never);
		db.member.count.mockResolvedValue(0 as never);

		await expect(
			getBillingStatus({ db, config: enabledConfig }, "org_gone"),
		).resolves.toMatchObject({
			state: "entitled",
			entitled: true,
			enforced: false,
		});
	});
});
