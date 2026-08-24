import "server-only";
import type { PrismaClient } from "@zemio/db";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { isUniqueConstraintError } from "@/server/shared/errors";
import { tierFromPrice } from "./billing.catalogue";
import { entitlementFromStripeStatus, isEntitled } from "./billing.policy";
import { billingRepository } from "./billing.repository";
import { notifyTrialEnding } from "./billing.trial";

/**
 * Keeping Zemio's copy of a subscription in step with Stripe.
 *
 * The event is treated as a signal that something changed, never as a claim
 * about what it changed to: the subscription is re-fetched from the API before
 * anything is written (ADR-0004). That is what makes out-of-order delivery
 * harmless, and it is not an extra call to optimise away.
 */

/** The slice of the Stripe client the webhook uses. */
export type WebhookStripeSource = {
	subscriptions: Pick<Stripe.SubscriptionResource, "retrieve">;
};

export type WebhookDependencies = {
	db: PrismaClient;
	stripe: WebhookStripeSource;
};

/**
 * What became of an event.
 *
 * `ignored` is a success: an event Zemio has no use for, and one about a
 * customer it does not know, are both ordinary. Only a genuine failure throws,
 * because a throw is what asks Stripe to redeliver.
 */
export type WebhookOutcome = "processed" | "duplicate" | "ignored";

/** Stripe hands back either the id or the expanded object; we only want the id. */
function idOf(
	value: string | { id: string } | null | undefined,
): string | null {
	if (!value) return null;
	return typeof value === "string" ? value : value.id;
}

/**
 * The subscription this event is about, without reading its state — and the
 * one place that decides which events Zemio acts on at all.
 *
 * A checkout session names its subscription; the subscription events are about
 * themselves. Anything else, and a session that started no subscription
 * because its mode was not `subscription`, names none: there is nothing to do.
 */
function subscriptionIdFrom(event: Stripe.Event): string | null {
	switch (event.type) {
		case "checkout.session.completed":
			return idOf(event.data.object.subscription);
		case "customer.subscription.created":
		case "customer.subscription.updated":
		case "customer.subscription.deleted":
		// Three days before a trial ends. Acted on so the owner can be warned;
		// its facts are recorded like any other subscription event.
		case "customer.subscription.trial_will_end":
			return event.data.object.id;
		default:
			return null;
	}
}

/**
 * Rolls the claim transaction back when the event id was already recorded.
 *
 * A sentinel rather than a `P2002` check around the whole transaction: the
 * writes inside it raise unique violations of their own, and answering "already
 * handled" to one of those would drop an event that was never applied.
 */
class EventAlreadyProcessed extends Error {}

/**
 * Handles a verified Stripe event.
 *
 * The event id is claimed in the same transaction as the state the event
 * describes. Claiming first is what makes a redelivery a no-op rather than a
 * second application (ADR-0004); claiming *atomically* is what stops a failure
 * between the two leaving an event marked handled that was never applied —
 * which no redelivery could then repair, because Stripe reuses the event id and
 * would be answered `duplicate` forever.
 */
export async function handleStripeEvent(
	deps: WebhookDependencies,
	event: Stripe.Event,
): Promise<WebhookOutcome> {
	// Not the idempotency mechanism, just a shortcut: Stripe redelivers
	// aggressively on any non-2xx, and a redelivery it has already had an answer
	// for should cost neither an API call nor a transaction. The claim below is
	// what actually decides.
	if (await billingRepository.hasProcessedStripeEvent(deps.db, event.id)) {
		return "duplicate";
	}

	// The re-fetch, ahead of the claim because it touches no database. See
	// ADR-0004 before removing it.
	const subscriptionId = subscriptionIdFrom(event);
	const subscription = subscriptionId
		? await deps.stripe.subscriptions.retrieve(subscriptionId)
		: null;

	try {
		const outcome = await deps.db.$transaction(async (tx) => {
			const db = tx as unknown as PrismaClient;

			// Every event is claimed, not just the four acted on, so the table grows
			// with the whole Stripe event volume — one paid checkout leaves around
			// thirty rows. That is accepted: filtering first would save rows at the
			// cost of the claim no longer covering every event.
			try {
				await billingRepository.recordStripeEvent(db, event.id, event.type);
			} catch (error) {
				if (isUniqueConstraintError(error)) throw new EventAlreadyProcessed();
				throw error;
			}

			if (!subscription) return "ignored";

			return await applyEvent(db, event, subscription);
		});

		// After the commit, never inside it: the send is slow, it can fail on
		// its own, and rolling the claim back over a failed email would have
		// Stripe redeliver an event whose state was already recorded.
		if (
			outcome === "processed" &&
			event.type === "customer.subscription.trial_will_end" &&
			subscription
		) {
			const customerId = idOf(subscription.customer);
			const organizationId = customerId
				? await billingRepository.findOrganizationIdByStripeCustomer(
						deps.db,
						customerId,
					)
				: null;

			if (organizationId) {
				await notifyTrialEnding(deps.db, organizationId);
			}
		}

		return outcome;
	} catch (error) {
		if (error instanceof EventAlreadyProcessed) return "duplicate";
		throw error;
	}
}

/** Everything the event means, once its id is claimed. */
async function applyEvent(
	db: PrismaClient,
	event: Stripe.Event,
	subscription: Stripe.Subscription,
): Promise<WebhookOutcome> {
	const customerId = idOf(subscription.customer);
	const organizationId = customerId
		? await billingRepository.findOrganizationIdByStripeCustomer(db, customerId)
		: null;

	// A customer Zemio does not know is not an error: the same Stripe account
	// may serve another environment, and a deleted organization leaves its
	// customer behind.
	if (!organizationId) {
		logger.warn("Stripe event for an unrecognised customer", {
			eventId: event.id,
			customerId,
		});
		return "ignored";
	}

	// The organization holds one row, keyed by organization rather than by
	// subscription, so an event about a subscription it has already moved on
	// from would otherwise overwrite the one it actually pays for. Re-fetching
	// does not help here: it faithfully returns the dead subscription's dead
	// state. Only a *demotion* is refused — a foreign subscription that is alive
	// is the organization's new one, and terminal news about the subscription on
	// record is exactly what this table exists to hear.
	const current = await billingRepository.findSubscription(db, organizationId);
	if (
		current &&
		current.stripeSubscriptionId !== subscription.id &&
		!isEntitled(entitlementFromStripeStatus(subscription.status))
	) {
		logger.warn("Ignoring a terminal event for a superseded subscription", {
			eventId: event.id,
			organizationId,
			endedSubscriptionId: subscription.id,
			currentSubscriptionId: current.stripeSubscriptionId,
		});
		return "ignored";
	}

	const items = subscription.items.data;
	// The tier is whichever item carries tier metadata, not whichever Stripe
	// happens to list first — item order is not guaranteed, and a subscription
	// may carry something alongside its tier. Falling back to the first item
	// keeps the status of a subscription that has no tiered item at all.
	const item =
		items.find((candidate) => tierFromPrice(candidate.price)) ?? items[0];
	if (!item) {
		logger.error("Stripe subscription has no items", {
			eventId: event.id,
			subscriptionId: subscription.id,
		});
		return "ignored";
	}

	const facts = {
		stripeSubscriptionId: subscription.id,
		stripePriceId: item.price.id,
		status: subscription.status,
		// The period end is the item's in the API version this SDK pins, and
		// Stripe counts in seconds.
		currentPeriodEnd: new Date(item.current_period_end * 1000),
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
	};

	const tier = tierFromPrice(item.price);

	// An untagged price means someone subscribed an organization to a price
	// that was never set up as a tier. Zemio will not invent commercial terms
	// (ADR-0003): the status still moves, and whatever tier is on record stays.
	if (!tier) {
		const updated = await billingRepository.updateSubscriptionIfPresent(
			db,
			organizationId,
			facts,
		);

		logger.error("Stripe price carries no Zemio tier metadata", {
			eventId: event.id,
			priceId: item.price.id,
			organizationId,
			updated,
		});

		return updated > 0 ? "processed" : "ignored";
	}

	await billingRepository.upsertSubscription(db, organizationId, {
		...facts,
		tier: tier.name,
		seatLimit: tier.seatLimit,
	});

	return "processed";
}
