import "server-only";
import type { PrismaClient } from "@zemio/db";
import type { BillingConfig } from "./billing.config";
import {
	type EntitlementState,
	isEntitled,
	isOverSeatLimit,
	resolveEntitlement,
} from "./billing.policy";
import { billingRepository } from "./billing.repository";

export type BillingServiceContext = {
	db: PrismaClient;
	config: BillingConfig;
};

/**
 * Everything the interface is allowed to know about an organization's billing,
 * and the only shape it reads — so the banner and the billing page cannot
 * disagree about what state an organization is in.
 *
 * A union on `enabled` rather than a wide object full of nulls: with billing
 * off there is no tier, no limit and no seat count worth reporting, and the
 * interface is forced to establish that billing exists before rendering
 * anything about it. Nothing here describes how billing is configured.
 */
export type BillingStatus =
	| { enabled: false; entitled: true }
	| {
			enabled: true;
			entitled: boolean;
			/**
			 * Whether this organization is one enforcement applies to.
			 *
			 * `state` cannot carry this on its own: it reads "entitled" both for an
			 * organization nothing is enforced against and for one with a healthy
			 * subscription. The banner has to tell those apart to stay quiet during
			 * a staged rollout. An organization-level fact, not configuration —
			 * nothing here says how the deployment bills.
			 */
			enforced: boolean;
			state: EntitlementState;
			tier: string | null;
			seatLimit: number | null;
			seatCount: number;
			overSeatLimit: boolean;
			/**
			 * Whether the subscription is still in its trial.
			 *
			 * `state` cannot carry this: `trialing` resolves to entitled, exactly
			 * like a healthy paid subscription, and the countdown has to tell
			 * those apart.
			 */
			trialing: boolean;
			/** When the paid period ends — during a trial, when the trial does. */
			currentPeriodEnd: Date | null;
			/** Whether the subscription ends rather than renews at that point. */
			cancelAtPeriodEnd: boolean;
	  };

/**
 * Whether an organization may currently create new work.
 *
 * The same question {@link getBillingStatus} answers, without the seat count:
 * the gate reads nothing but this, and seats are advisory and never an input
 * to the decision (ADR-0005). Kept beside the status so the two cannot drift —
 * both resolve through {@link resolveEntitlement}.
 */
export async function isOrganizationEntitled(
	ctx: BillingServiceContext,
	organizationId: string,
): Promise<boolean> {
	if (!ctx.config.enabled) return true;

	const organization = await billingRepository.findOrganizationBilling(
		ctx.db,
		organizationId,
	);

	return isEntitled(
		resolveEntitlement({
			billingEnabled: true,
			// A vanished organization is a race, not a state to enforce against.
			// Defaulting to enforced would refuse it for a billing reason it has
			// no subscription to fix; the operation it was attempting raises its
			// own, accurate `NOT_FOUND` a moment later (ADR-0001).
			enforcedForOrganization: organization?.billingEnforced ?? false,
			subscription: organization?.subscription ?? null,
		}),
	);
}

/**
 * Resolves an organization's billing status.
 *
 * With billing switched off this short-circuits before touching the database:
 * a self-hosted instance runs no billing queries at all, and every organization
 * is entitled unconditionally (ADR-0001).
 */
export async function getBillingStatus(
	ctx: BillingServiceContext,
	organizationId: string,
): Promise<BillingStatus> {
	if (!ctx.config.enabled) {
		return { enabled: false, entitled: true };
	}

	const [organization, seatCount] = await Promise.all([
		billingRepository.findOrganizationBilling(ctx.db, organizationId),
		billingRepository.countSeats(ctx.db, organizationId),
	]);

	// A caller with a resolved membership whose organization has since vanished
	// is a race, not a state to serve. Enforcement does not apply to something
	// that is not there: the banner stays quiet and whatever the caller does
	// next reports the real problem, rather than a billing one it cannot fix.
	const subscription = organization?.subscription ?? null;
	const enforced = organization?.billingEnforced ?? false;
	const state = resolveEntitlement({
		billingEnabled: true,
		enforcedForOrganization: enforced,
		subscription,
	});

	return {
		enabled: true,
		entitled: isEntitled(state),
		enforced,
		state,
		tier: subscription?.tier ?? null,
		seatLimit: subscription?.seatLimit ?? null,
		seatCount,
		overSeatLimit: isOverSeatLimit(seatCount, subscription?.seatLimit ?? null),
		trialing: subscription?.status === "trialing",
		currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
		cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
	};
}
