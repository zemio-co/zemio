import "server-only";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { logger } from "@/lib/logger";
import { createOrganizationSlug, SELF_SERVE_REFUSAL } from "@/lib/organization";
import type { TrialStarted } from "@/server/modules/billing/billing.trial";
import {
	mayStartTrial,
	refuseSelfServeCreation,
} from "./organization.self-serve";

/**
 * Creating an organization for yourself.
 *
 * The one path that turns a person with nowhere to go into an owner. It is
 * deliberately not the platform admin's path: that one provisions an
 * organization for somebody else and requires a tenant, this one starts a
 * trial and opens to nobody (ADR-0009).
 */

export type SelfServeDependencies = {
	db: PrismaClient;
	/**
	 * Creates the organization and its owner member.
	 *
	 * Injected rather than imported so this module does not reach into Better
	 * Auth, which reaches back into the joining resolver during session
	 * creation.
	 */
	createOrganization: (args: {
		name: string;
		slug: string;
		userId: string;
	}) => Promise<{ id: string }>;
	/** Starts the trial, or reports that billing had none to start. */
	startTrial: (organizationId: string) => Promise<TrialStarted | null>;
};

// Re-exported because this is what raises it; defined in `@/lib/organization`
// because this module is server-only and the browser needs the same strings.
export { SELF_SERVE_REFUSAL };

/**
 * A slug nobody else holds.
 *
 * Two initiatives called Robotics is ordinary, and the second one never chose
 * the slug that collided — so it is given a distinct one rather than an error
 * about a name it did not pick.
 */
async function availableSlug(db: PrismaClient, name: string): Promise<string> {
	// A name carrying no Latin letters or digits — "研究会", "Δ" — slugifies to
	// nothing, and Better Auth refuses an empty slug with a validation error
	// about a field the person never filled in. Given a base to distinguish
	// instead, which the collision branch below then makes unique.
	const base = createOrganizationSlug(name) || "org";

	const taken = await db.organization.findFirst({
		where: { slug: base },
		select: { id: true },
	});

	if (!taken) return base;

	return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * Creates the organization, working around a slug someone else holds.
 *
 * Checking availability is not enough on its own: two people creating
 * "Robotics" in the same moment both see the slug free, and one of them then
 * loses on the unique constraint — receiving an error about a name they never
 * chose, which is exactly what {@link availableSlug} exists to prevent. The
 * check keeps the common case tidy; this is what makes its promise hold under
 * concurrency.
 *
 * Two attempts: the second asks for a fresh suffix, and a random suffix losing
 * as well is not a collision any more.
 */
async function createWithFreeSlug(
	deps: SelfServeDependencies,
	name: string,
	userId: string,
): Promise<{ id: string }> {
	try {
		return await deps.createOrganization({
			name,
			slug: await availableSlug(deps.db, name),
			userId,
		});
	} catch {
		return deps.createOrganization({
			name,
			slug: `${createOrganizationSlug(name) || "org"}-${crypto.randomUUID().slice(0, 6)}`,
			userId,
		});
	}
}

/**
 * Puts the organization under billing enforcement.
 *
 * `updateMany` rather than `update` so an organization deleted in the moment
 * between creating it and this line is a no-op rather than a throw.
 */
async function enforceBilling(
	deps: SelfServeDependencies,
	organizationId: string,
): Promise<void> {
	await deps.db.organization.updateMany({
		where: { id: organizationId },
		data: { billingEnforced: true },
	});
}

export async function createSelfServeOrganization(
	deps: SelfServeDependencies,
	actor: { userId: string },
	input: { name: string },
): Promise<{ id: string }> {
	const [user, trialingOrganizations] = await Promise.all([
		deps.db.user.findUnique({
			where: { id: actor.userId },
			select: { emailVerified: true },
		}),
		// Owned, not merely joined: a trial belongs to whoever committed the
		// organization to it.
		deps.db.member.count({
			where: {
				userId: actor.userId,
				role: "owner",
				organization: { subscription: { status: "trialing" } },
			},
		}),
	]);

	const refusal = refuseSelfServeCreation({
		emailVerified: user?.emailVerified ?? false,
	});

	if (refusal) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: SELF_SERVE_REFUSAL[refusal],
		});
	}

	const organization = await createWithFreeSlug(deps, input.name, actor.userId);

	if (mayStartTrial({ trialingOrganizations })) {
		// Starting the trial is what switches enforcement on, atomically with
		// the subscription row it depends on. A trial that could not start —
		// billing switched off, a Stripe outage, no price tagged as the trial
		// tier — leaves a working organization and a log line, never a
		// brand-new organization that is read-only for a reason its owner can
		// neither see nor fix (ADR-0009, ADR-0001).
		try {
			await deps.startTrial(organization.id);
		} catch (error) {
			logger.error("Could not start a trial for a new organization", {
				organizationId: organization.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	} else {
		// Their one trial is already running elsewhere. This organization is
		// unentitled from the start and deliberately so — read-only until it
		// subscribes, which is a state its owner can see and act on, unlike the
		// failures above. Checkout stays open to them precisely because there is
		// no subscription yet.
		await enforceBilling(deps, organization.id);

		logger.info("organization.created_without_trial", {
			organizationId: organization.id,
			userId: actor.userId,
		});
	}

	// So the next session opens here rather than in whichever organization they
	// happened to join first. Best-effort: the organization exists and its
	// trial has started, and failing the mutation over a convenience would
	// report creation as failed and have them create a second one.
	try {
		await deps.db.user.update({
			where: { id: actor.userId },
			data: { lastActiveOrganizationId: organization.id },
		});
	} catch (error) {
		logger.error("Could not remember the newly created organization", {
			organizationId: organization.id,
			userId: actor.userId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	logger.info("organization.self_serve_created", {
		organizationId: organization.id,
		userId: actor.userId,
	});

	return organization;
}
