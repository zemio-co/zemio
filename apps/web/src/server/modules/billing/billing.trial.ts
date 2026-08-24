import "server-only";
import type { PrismaClient } from "@zemio/db";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { findTrialTier, type TierPriceSource } from "./billing.catalogue";
import {
	type CustomerStripeSource,
	resolveCustomerId,
} from "./billing.customer";
import { billingRepository } from "./billing.repository";
import { withStripe } from "./billing.stripe";

/**
 * Starting the trial a self-created organization gets.
 *
 * A real Stripe subscription rather than a date column, because `trialing`
 * already resolves to entitled and every other part of billing — the portal,
 * the webhooks, the cached row — then works unchanged (ADR-0009).
 */

/** How long a trial runs. Fixed when the subscription is created. */
export const TRIAL_PERIOD_DAYS = 30;

/** The slice of the Stripe client starting a trial uses. */
export type TrialStripeSource = TierPriceSource &
	CustomerStripeSource & {
		subscriptions: Pick<Stripe.SubscriptionResource, "create">;
	};

export type TrialDependencies = {
	db: PrismaClient;
	stripe: TrialStripeSource;
};

export type TrialStarted = {
	subscriptionId: string;
	status: string;
};

/**
 * Starts a card-less trial for an organization, or reports that it could not.
 *
 * Returns `null` rather than throwing when the dashboard names no trial tier.
 * The caller is in the middle of creating somebody's organization, and a
 * missing price is the operator's mistake to fix — refusing the organization
 * would make it the new customer's problem instead (ADR-0009).
 */
export async function startTrial(
	deps: TrialDependencies,
	args: { organizationId: string },
): Promise<TrialStarted | null> {
	const tier = await findTrialTier(deps.stripe);

	if (!tier) {
		logger.error("No Stripe price is tagged as the trial tier", {
			organizationId: args.organizationId,
		});
		return null;
	}

	const customerId = await resolveCustomerId(deps, args.organizationId);

	const subscription = await withStripe("subscriptions.create", () =>
		deps.stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: tier.priceId, quantity: 1 }],
			trial_period_days: TRIAL_PERIOD_DAYS,
			// The whole decision, in one field. `cancel` lands on `canceled`,
			// which Zemio already maps to read-only and already receives as
			// `customer.subscription.deleted`; `pause` would leave the
			// organization entitled forever (ADR-0009).
			trial_settings: {
				end_behavior: { missing_payment_method: "cancel" },
			},
			// Also on the subscription itself, so support can answer "whose is
			// this?" without following it to its customer.
			metadata: { organizationId: args.organizationId },
		}),
	);

	// Recorded from the API response rather than left to the webhook. The
	// caller switches enforcement on next, and an organization with enforcement
	// on and no subscription row is read-only — which is what it would be for
	// however long `customer.subscription.created` takes to arrive. The webhook
	// overwrites this row when it lands (ADR-0004).
	const item = subscription.items.data[0];

	if (item) {
		await billingRepository.upsertSubscription(deps.db, args.organizationId, {
			stripeSubscriptionId: subscription.id,
			stripePriceId: item.price.id,
			status: subscription.status,
			currentPeriodEnd: new Date(item.current_period_end * 1000),
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			tier: tier.name,
			seatLimit: tier.seatLimit,
		});
	}

	logger.info("billing.trial_started", {
		organizationId: args.organizationId,
		subscriptionId: subscription.id,
		tier: tier.name,
	});

	return { subscriptionId: subscription.id, status: subscription.status };
}
