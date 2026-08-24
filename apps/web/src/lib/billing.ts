/**
 * How Stripe tells the billing page which way a checkout went.
 *
 * Shared rather than server-only on purpose: the checkout service hands these
 * to Stripe, and the billing page reads them back off the URL, so both sides
 * need them. Nothing here is configuration — no secret, no account, nothing
 * that says whether this deployment bills at all.
 *
 * The path an owner returns to is {@link ROUTES.SETTINGS_ORG_BILLING}, so the
 * route and the page cannot drift apart either.
 */
export const CHECKOUT_RESULT_PARAM = "checkout";

/**
 * The message carried by a refusal that is about billing.
 *
 * Lives here rather than beside the gate that raises it because both sides need
 * it: the gate is `server-only`, and the interface has to recognise this one
 * `FORBIDDEN` among all the others to explain it. A member who did not cause
 * the lapse and cannot resolve it should be told what happened and who can
 * help, not shown a bare permission error — or, worse, this constant.
 */
export const BILLING_NOT_ENTITLED = "BILLING_NOT_ENTITLED";

/** Whether a failed call was refused because the organization is not entitled. */
export function isBillingRefusal(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		(error as { message?: unknown }).message === BILLING_NOT_ENTITLED
	);
}

export const CHECKOUT_RESULT = {
	complete: "complete",
	cancelled: "cancelled",
} as const;

export type CheckoutResult = keyof typeof CHECKOUT_RESULT;

/**
 * Which banner an organization's billing state calls for, if any.
 *
 * A pure function beside the checkout constants rather than in the component,
 * for the same reason the entitlement rules are pure: this decides whether
 * every member of an organization is shown an alarming message, and getting it
 * wrong in either direction — crying wolf, or staying silent while people are
 * refused — is worth testing without rendering anything.
 */
export type BillingBannerKind =
	| "read_only"
	| "payment_failing"
	| "trial"
	| "over_seat_limit";

/**
 * The slice of the billing status a banner decision reads.
 *
 * Structural rather than the whole status, so this file needs nothing from the
 * server module and the browser is handed no billing configuration.
 */
export type BannerStatus =
	| { enabled: false }
	| {
			enabled: true;
			enforced: boolean;
			state: "entitled" | "payment_failing" | "read_only";
			overSeatLimit: boolean;
			trialing: boolean;
	  };

export function resolveBillingBanner(
	status: BannerStatus,
): BillingBannerKind | null {
	// Both switches, the same pair the entitlement rules read: a deployment that
	// does not bill, and an organization not yet rolled out to, are both states
	// where nothing is being enforced and so nothing needs saying (ADR-0001).
	if (!status.enabled || !status.enforced) {
		return null;
	}

	// Most consequential first, one banner at a time. Being unable to create
	// work outranks a seat count, and a failing payment outranks it too — it is
	// the one an owner can still act on before it becomes the former.
	if (status.state === "read_only") return "read_only";
	if (status.state === "payment_failing") return "payment_failing";

	// A trial is entitled, so nothing else would ever mention it. Shown from
	// the first day rather than near the end: the deadline is what makes a
	// card-less trial fair, and it should never arrive as a surprise
	// (ADR-0009).
	if (status.trialing) return "trial";

	// Advisory only, and deliberately last: nothing is refused over seats
	// (ADR-0005).
	return status.overSeatLimit ? "over_seat_limit" : null;
}

/**
 * Whole days left of a trial, never negative.
 *
 * Rounded up, so the last partial day still reads as "1 day left" rather than
 * as none — a countdown that reaches zero while the organization is still
 * working would be telling people something untrue.
 */
export function trialDaysRemaining(end: Date | null, now: Date): number | null {
	if (!end) return null;

	const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
	return Math.max(days, 0);
}
