import { describe, expect, it } from "vitest";
import {
	type BannerStatus,
	BILLING_NOT_ENTITLED,
	isBillingRefusal,
	resolveBillingBanner,
	trialDaysRemaining,
} from "./billing";

/** A healthy, enforced organization well inside its tier. */
const healthy: BannerStatus = {
	enabled: true,
	enforced: true,
	state: "entitled",
	overSeatLimit: false,
	trialing: false,
};

describe("resolveBillingBanner, when there is nothing to say", () => {
	it("shows nothing on a deployment that does not bill", () => {
		// A self-hoster has no billing to be warned about (ADR-0001).
		expect(resolveBillingBanner({ enabled: false })).toBeNull();
	});

	it("shows nothing to a healthy organization within its seats", () => {
		expect(resolveBillingBanner(healthy)).toBeNull();
	});

	it("shows nothing to an organization enforcement does not apply to", () => {
		// Billing is on for the deployment but this organization has not been
		// rolled out to yet. Nothing is being enforced against it, so warning it
		// about billing would be warning it about a rule it is not subject to.
		expect(
			resolveBillingBanner({
				enabled: true,
				enforced: false,
				state: "read_only",
				overSeatLimit: true,
				trialing: false,
			}),
		).toBeNull();
	});
});

describe("resolveBillingBanner, when something is wrong", () => {
	it("tells a lapsed organization it is read-only", () => {
		expect(resolveBillingBanner({ ...healthy, state: "read_only" })).toBe(
			"read_only",
		);
	});

	it("warns an organization whose payment is being retried", () => {
		expect(resolveBillingBanner({ ...healthy, state: "payment_failing" })).toBe(
			"payment_failing",
		);
	});

	it("tells an entitled organization it is over its seat limit", () => {
		expect(resolveBillingBanner({ ...healthy, overSeatLimit: true })).toBe(
			"over_seat_limit",
		);
	});
});

describe("resolveBillingBanner precedence", () => {
	// One banner at a time, most consequential first: being unable to create
	// work matters more than a seat count, and a failing payment is the thing
	// an owner can still act on before it becomes the former.

	it("puts being read-only ahead of the seat count", () => {
		expect(
			resolveBillingBanner({
				...healthy,
				state: "read_only",
				overSeatLimit: true,
			}),
		).toBe("read_only");
	});

	it("puts a failing payment ahead of the seat count", () => {
		expect(
			resolveBillingBanner({
				...healthy,
				state: "payment_failing",
				overSeatLimit: true,
			}),
		).toBe("payment_failing");
	});
});

describe("isBillingRefusal", () => {
	it("recognises the marker the gate raises", () => {
		// The gate can only send a marker — it has no locale to write prose in —
		// so the interface has to be the thing that turns it into words.
		expect(isBillingRefusal({ message: BILLING_NOT_ENTITLED })).toBe(true);
	});

	it("leaves every other failure alone", () => {
		expect(isBillingRefusal({ message: "You may not edit this report." })).toBe(
			false,
		);
		expect(isBillingRefusal(null)).toBe(false);
		expect(isBillingRefusal(undefined)).toBe(false);
		expect(isBillingRefusal("BILLING_NOT_ENTITLED")).toBe(false);
	});
});

describe("resolveBillingBanner during a trial", () => {
	it("counts a trial down from the first day", () => {
		// A trial resolves to entitled, so without this nothing would ever
		// mention it and it would simply stop.
		expect(resolveBillingBanner({ ...healthy, trialing: true })).toBe("trial");
	});

	it("stays quiet about a trial nothing is enforced against", () => {
		expect(
			resolveBillingBanner({ ...healthy, enforced: false, trialing: true }),
		).toBeNull();
	});

	it("reports a failing payment ahead of the countdown", () => {
		expect(
			resolveBillingBanner({
				...healthy,
				state: "payment_failing",
				trialing: true,
			}),
		).toBe("payment_failing");
	});

	it("reports the countdown ahead of a seat count", () => {
		expect(
			resolveBillingBanner({ ...healthy, trialing: true, overSeatLimit: true }),
		).toBe("trial");
	});
});

describe("trialDaysRemaining", () => {
	const now = new Date("2026-08-24T10:00:00Z");

	it("counts whole days left", () => {
		expect(trialDaysRemaining(new Date("2026-09-03T10:00:00Z"), now)).toBe(10);
	});

	it("rounds a part day up, so the last day is not reported as none", () => {
		expect(trialDaysRemaining(new Date("2026-08-24T22:00:00Z"), now)).toBe(1);
	});

	it("never counts below zero", () => {
		expect(trialDaysRemaining(new Date("2026-08-20T10:00:00Z"), now)).toBe(0);
	});

	it("has nothing to count without an end", () => {
		expect(trialDaysRemaining(null, now)).toBeNull();
	});
});
