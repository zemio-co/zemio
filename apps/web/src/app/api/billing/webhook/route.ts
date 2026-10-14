import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { billingConfig } from "@/server/modules/billing/billing.config";
import { getStripe } from "@/server/modules/billing/billing.stripe";
import { handleStripeEvent } from "@/server/modules/billing/billing.webhook";
import { readCappedBody } from "@/server/shared/read-capped-body";

/**
 * Stripe's webhook endpoint.
 *
 * Outside tRPC because signature verification needs the raw request body. A
 * thin adapter on purpose: verify, delegate, answer. Every decision about what
 * an event means belongs to `handleStripeEvent`.
 */
/**
 * The largest body worth reading. Stripe's own events run to a few kilobytes;
 * this leaves room for one that grows without leaving the endpoint open.
 */
const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: Request): Promise<Response> {
	// An instance that does not bill has no webhook to offer, and answering
	// anything else would advertise an endpoint it cannot verify against.
	if (!billingConfig.enabled) {
		return new Response("Not found", { status: 404 });
	}

	const signature = request.headers.get("stripe-signature");
	if (!signature) {
		return new Response("Missing signature", { status: 400 });
	}

	// Nothing here is authenticated until the signature is checked, and checking
	// it needs the whole body in memory first. Route handlers have no body limit
	// of their own, so without a cap an anonymous request could pin arbitrarily
	// much heap before being rejected — repeated, that is the whole app rather
	// than just billing. Stripe events do not approach this size.
	const body = await readCappedBody(request, MAX_BODY_BYTES);
	if (body === null) {
		return new Response("Payload too large", { status: 413 });
	}

	let event: Stripe.Event;
	try {
		event = await getStripe().webhooks.constructEventAsync(
			body,
			signature,
			billingConfig.webhookSecret,
		);
	} catch (error) {
		// Unverified: this did not come from Stripe, or the secret is wrong.
		// Either way nothing is read or written. The 400 does not stop redelivery
		// — Stripe counts every non-2xx as a failed delivery and retries with
		// backoff for about three days — but it is still the honest answer, and the
		// one Stripe's own examples give: forged traffic has earned no 2xx, and a
		// wrong secret is a misconfiguration those retries should keep visible
		// until someone fixes it.
		logger.warn("Rejected an unverified Stripe webhook", {
			error: error instanceof Error ? error.message : String(error),
		});
		return new Response("Invalid signature", { status: 400 });
	}

	// A throw here answers 500, which is Stripe's cue to redeliver.
	const outcome = await handleStripeEvent({ db, stripe: getStripe() }, event);

	return Response.json({ received: true, outcome });
}
