import "server-only";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { billingRepository } from "./billing.repository";
import { withStripe } from "./billing.stripe";

/**
 * The Stripe customer an organization pays as.
 *
 * Extracted from checkout because a trial needs the same customer, and the
 * claim race below is subtle enough that a second copy of it would be a second
 * chance to get it wrong.
 */

/** The slice of the Stripe client resolving a customer uses. */
export type CustomerStripeSource = {
	customers: Pick<Stripe.CustomerResource, "create" | "del">;
};

export type CustomerDependencies = {
	db: PrismaClient;
	stripe: CustomerStripeSource;
};

/**
 * Removes a customer created for a checkout that then did not claim it — lost
 * the race, or failed to record it.
 *
 * Left behind, it would carry the same `organizationId` metadata as the real
 * one — turning the single question that metadata exists to answer, "whose
 * customer is this?", into a guess between two, forever.
 *
 * Deliberately not through {@link withStripe}, which converts a provider failure
 * into a refusal for the caller to show. There is nothing to refuse here: the
 * customer this checkout will use is already settled, and the owner is waiting
 * on a purchase that has no reason to fail over housekeeping. An undeleted
 * customer is a support annoyance; a failed checkout is lost revenue. Logged
 * with both ids so it can be swept by hand.
 */
async function discardUnclaimedCustomer(
	deps: CustomerDependencies,
	organizationId: string,
	customerId: string,
): Promise<void> {
	try {
		await deps.stripe.customers.del(customerId);
	} catch (error) {
		logger.error("Could not delete the customer a lost checkout race created", {
			organizationId,
			customerId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Decides what a customer is for after the write claiming it failed.
 *
 * A failed claim is not a lost one: the write may have landed before the
 * error — a timeout on the reply, a connection dropped after the commit — so
 * the stored value is read back rather than assumed. Ours stored means the
 * claim held. Another stored means a concurrent checkout won, and ours is
 * discarded as in a lost race. Nothing stored means the claim never happened:
 * ours is discarded, so the retry this error invites does not leave a second
 * customer carrying the same organization, and the error stands.
 *
 * If the read-back fails too, nothing can be known, and the customer is kept
 * rather than deleted — deleting one the organization may already pay as is
 * the worse mistake. It is logged with both ids so it can be swept by hand.
 */
async function settleAfterFailedClaim(
	deps: CustomerDependencies,
	organizationId: string,
	customerId: string,
	claimError: unknown,
): Promise<string> {
	let current: Awaited<
		ReturnType<typeof billingRepository.findOrganizationCustomer>
	>;

	try {
		current = await billingRepository.findOrganizationCustomer(
			deps.db,
			organizationId,
		);
	} catch (readError) {
		logger.error("Could not tell whether a new Stripe customer was claimed", {
			organizationId,
			customerId,
			error: readError instanceof Error ? readError.message : String(readError),
		});
		throw claimError;
	}

	if (current?.stripeCustomerId === customerId) return customerId;

	await discardUnclaimedCustomer(deps, organizationId, customerId);

	if (current?.stripeCustomerId) return current.stripeCustomerId;

	throw claimError;
}

/**
 * Finds the Stripe customer this organization pays as, creating one if this is
 * its first checkout.
 *
 * Lazy by design, but no longer only at checkout: a self-created organization
 * gets its customer when its trial starts, which is at creation (ADR-0009). An
 * organization that neither subscribes nor trials still never gets one.
 */
export async function resolveCustomerId(
	deps: CustomerDependencies,
	organizationId: string,
): Promise<string> {
	const organization = await billingRepository.findOrganizationCustomer(
		deps.db,
		organizationId,
	);

	if (!organization) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "This organization no longer exists.",
		});
	}

	if (organization.stripeCustomerId) return organization.stripeCustomerId;

	const customer = await withStripe("customers.create", () =>
		deps.stripe.customers.create({
			name: organization.name,
			// Written on the customer as well as the session so the link between
			// organization and customer is recoverable from either side.
			metadata: { organizationId },
		}),
	);

	let claimed: boolean;

	try {
		claimed = await billingRepository.claimStripeCustomer(
			deps.db,
			organizationId,
			customer.id,
		);
	} catch (error) {
		return settleAfterFailedClaim(deps, organizationId, customer.id, error);
	}

	if (claimed) return customer.id;

	// A concurrent first checkout got there first. Its customer is the one the
	// organization pays as, and the one this session must use — the customer
	// just created is discarded rather than given a subscription no organization
	// would claim. Discarded before the read-back, because the read-back has a
	// failing path of its own and this customer is unused either way.
	await discardUnclaimedCustomer(deps, organizationId, customer.id);

	const current = await billingRepository.findOrganizationCustomer(
		deps.db,
		organizationId,
	);

	if (!current?.stripeCustomerId) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Could not set this organization up for billing.",
		});
	}

	return current.stripeCustomerId;
}
