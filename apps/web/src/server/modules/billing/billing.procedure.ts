import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { env } from "@/env";
import type { CheckoutDependencies } from "./billing.checkout";
import { billingConfig } from "./billing.config";
import type { PortalDependencies } from "./billing.portal";
import type { BillingServiceContext } from "./billing.service";
import { getStripe } from "./billing.stripe";
import { startTrial, type TrialStarted } from "./billing.trial";

export type BillingRequestContext = {
	db: PrismaClient;
};

/**
 * The billing configuration is supplied here rather than living on the tRPC
 * context, so the shared context and the test utilities stay free of billing.
 */
export function toBillingServiceContext(
	ctx: BillingRequestContext,
): BillingServiceContext {
	return { db: ctx.db, config: billingConfig };
}

/**
 * The dependencies a billing mutation needs, assembled at the procedure.
 *
 * One factory for checkout and the portal both: they want the same three
 * things, and the guard below is the sort that must not be remembered
 * separately at each call site.
 *
 * Constructing the Stripe client here rather than on the context means only
 * the procedures that actually bill ever build one, and a service can be
 * tested by handing it a stub instead.
 *
 * Refuses before building anything when the deployment does not bill: a
 * self-hoster has no billing interface to reach this from, and one that
 * reaches it anyway deserves a plain answer rather than the credentials error
 * `getStripe` would raise (ADR-0001).
 */
export function toBillingDependencies(
	ctx: BillingRequestContext,
): CheckoutDependencies & PortalDependencies {
	if (!billingConfig.enabled) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "This Zemio instance does not handle billing.",
		});
	}

	return {
		db: ctx.db,
		stripe: getStripe(),
		// Better Auth's URL is the deployment's own public origin, which is what
		// Stripe has to send the owner back to. The trailing slash `z.url()`
		// happily accepts is stripped here: every return URL appends a rooted
		// path, and Stripe would be handed `https://host//settings/...`.
		appUrl: env.BETTER_AUTH_URL.replace(/\/+$/, ""),
	};
}

/**
 * Starts a trial for a newly created organization, or reports that this
 * deployment has none to start.
 *
 * The whole of "a self-hosted instance has no trial" lives here (ADR-0009). No
 * Stripe client is built, no subscription row is written, and the organization
 * is entitled unconditionally because enforcement is never switched on for it
 * (ADR-0001).
 */
export function startTrialIfBilling(
	ctx: BillingRequestContext,
	organizationId: string,
): Promise<TrialStarted | null> {
	if (!billingConfig.enabled) return Promise.resolve(null);

	return startTrial({ db: ctx.db, stripe: getStripe() }, { organizationId });
}
