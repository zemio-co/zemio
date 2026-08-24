import "server-only";
import type { PrismaClient } from "@zemio/db";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/lib/routes";
import { absoluteUrl, getEmailer, logSend } from "@/server/email";
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
 * Starts a card-less trial for an organization and puts it under enforcement,
 * or reports that it could not.
 *
 * Returns `null` rather than throwing when the dashboard names no trial tier.
 * The caller is in the middle of creating somebody's organization, and a
 * missing price is the operator's mistake to fix — refusing the organization
 * would make it the new customer's problem instead (ADR-0009).
 *
 * Enforcement is switched on here rather than by the caller because it is the
 * other half of the same fact, and the two must not be able to disagree.
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

	// Recorded from the API response rather than left to the webhook. Enforcement
	// is switched on just below, and an organization with enforcement on and no
	// subscription row is read-only — which is what it would be for however long
	// `customer.subscription.created` takes to arrive. The webhook overwrites
	// this row when it lands (ADR-0004).
	const item = subscription.items.data[0];

	// No item means no row, and reporting a trial the caller would then switch
	// enforcement on for is exactly the read-only-on-arrival this method exists
	// to avoid. Reported as no trial instead: the subscription in Stripe is
	// real and the log says so, but the organization keeps working.
	if (!item) {
		logger.error("Stripe returned a trial subscription with no items", {
			organizationId: args.organizationId,
			subscriptionId: subscription.id,
		});
		return null;
	}

	// The row and the enforcement switch move together or not at all.
	//
	// They are two halves of one fact: Stripe is now billing this organization.
	// Written apart, a failure between them leaves either an organization that
	// is read-only on arrival (enforced, no row) or one that is free forever
	// (a real trial, never enforced, still entitled when Stripe cancels it) —
	// and nothing later repairs the second, because the webhook writes the row
	// and never touches enforcement.
	await deps.db.$transaction(async (tx) => {
		const db = tx as unknown as PrismaClient;

		await billingRepository.upsertSubscription(db, args.organizationId, {
			stripeSubscriptionId: subscription.id,
			stripePriceId: item.price.id,
			status: subscription.status,
			currentPeriodEnd: new Date(item.current_period_end * 1000),
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			tier: tier.name,
			seatLimit: tier.seatLimit,
		});

		await billingRepository.setBillingEnforced(db, args.organizationId, true);
	});

	logger.info("billing.trial_started", {
		organizationId: args.organizationId,
		subscriptionId: subscription.id,
		tier: tier.name,
	});

	return { subscriptionId: subscription.id, status: subscription.status };
}

/**
 * Tells an organization's owner that its trial is about to end.
 *
 * Stripe raises `customer.subscription.trial_will_end` three days out. Without
 * acting on it a card-less trial simply stops: the organization goes read-only
 * mid-report, having been told nothing (ADR-0009).
 *
 * Best-effort, and deliberately outside the webhook's transaction. The event is
 * already claimed by the time this runs, so a throw would have Stripe retry an
 * event that has already been applied — and be answered `duplicate` forever
 * while the owner still heard nothing.
 */
export async function notifyTrialEnding(
	db: PrismaClient,
	organizationId: string,
): Promise<void> {
	try {
		const contact = await billingRepository.findOwnerContact(db, organizationId);

		if (!contact) {
			logger.error("No owner to warn that a trial is ending", {
				organizationId,
			});
			return;
		}

		const result = await getEmailer().sendTrialEnding({
			to: contact.ownerEmail,
			organizationName: contact.organizationName,
			billingUrl: absoluteUrl(ROUTES.SETTINGS_ORG_BILLING()),
		});

		logSend("email.trial_ending", result, { organizationId });
	} catch (error) {
		logger.error("email.trial_ending_failed", { organizationId, error });
	}
}
