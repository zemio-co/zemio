import "server-only";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { logger } from "@/lib/logger";
import { createOrganizationSlug, SELF_SERVE_REFUSAL } from "@/lib/organization";
import { billingRepository } from "@/server/modules/billing/billing.repository";
import type { TrialStarted } from "@/server/modules/billing/billing.trial";
import { refuseSelfServeCreation } from "./organization.self-serve";

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
 * Whether a creation failed because somebody else took the slug — the one
 * failure a different slug can fix.
 *
 * Better Auth reports a slug its own check found taken as
 * `ORGANIZATION_ALREADY_EXISTS`. Two creations in the same moment both pass
 * that check, though, and the loser fails later, on the unique constraint, as
 * whatever error the database adapter raises — a shape this code would have to
 * guess. So the failure is also settled by looking: if the slug is now held by
 * an organization this person is not in, someone else took it.
 *
 * Held by one they *are* in means this very attempt got as far as creating it,
 * and asking again would leave them with two. Every other failure — a
 * validation error, a refused permission, a database that is down — is
 * unchanged by another name. Both are left to stand.
 */
async function isSlugTakenByOthers(
	db: PrismaClient,
	error: unknown,
	slug: string,
	userId: string,
): Promise<boolean> {
	if (typeof error === "object" && error !== null && "body" in error) {
		const body = (error as { body?: { code?: unknown } }).body;
		if (body?.code === "ORGANIZATION_ALREADY_EXISTS") return true;
	}

	try {
		const holder = await db.organization.findFirst({
			where: { slug },
			select: { members: { where: { userId }, select: { id: true } } },
		});

		return holder !== null && holder.members.length === 0;
	} catch {
		// Cannot tell, so do not guess: the original failure stands.
		return false;
	}
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
 * Only a taken slug is retried. Retrying anything else would report the second
 * failure in place of the real one, and would ask again for something that may
 * have partly succeeded — leaving the person with two organizations where the
 * error said they had none.
 */
async function createWithFreeSlug(
	deps: SelfServeDependencies,
	name: string,
	userId: string,
): Promise<{ id: string }> {
	const slug = await availableSlug(deps.db, name);

	try {
		return await deps.createOrganization({ name, slug, userId });
	} catch (error) {
		if (!(await isSlugTakenByOthers(deps.db, error, slug, userId))) throw error;

		return deps.createOrganization({
			name,
			slug: `${createOrganizationSlug(name) || "org"}-${crypto.randomUUID().slice(0, 6)}`,
			userId,
		});
	}
}

/**
 * Claims this person's one trial, or reports that it is spent (ADR-0009).
 *
 * A conditional update rather than a read followed by a decision: two
 * organizations created in the same moment would both read "no trial yet" and
 * both start one. Here exactly one update matches. Returns the claim's
 * timestamp, which is what {@link releaseTrialClaim} matches on.
 */
async function claimTrial(
	db: PrismaClient,
	userId: string,
): Promise<Date | null> {
	const claimedAt = new Date();
	const { count } = await db.user.updateMany({
		where: { id: userId, trialClaimedAt: null },
		data: { trialClaimedAt: claimedAt },
	});

	return count === 1 ? claimedAt : null;
}

/**
 * Hands a claimed trial back when no trial came of it.
 *
 * Billing switched off, no price tagged as the trial tier, Stripe failing
 * before it created anything: none of these is the person having had their
 * trial, and keeping the claim would spend it on a failure they never saw.
 * Matched on this claim's own timestamp, so it can only undo itself.
 *
 * Best-effort. A failure here costs the person their trial, not their
 * organization, and is logged for support to undo.
 */
async function releaseTrialClaim(
	db: PrismaClient,
	userId: string,
	claimedAt: Date,
): Promise<void> {
	try {
		await db.user.updateMany({
			where: { id: userId, trialClaimedAt: claimedAt },
			data: { trialClaimedAt: null },
		});
	} catch (error) {
		logger.error("Could not hand back a trial that never started", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function createSelfServeOrganization(
	deps: SelfServeDependencies,
	actor: { userId: string },
	input: { name: string },
): Promise<{ id: string }> {
	const user = await deps.db.user.findUnique({
		where: { id: actor.userId },
		select: { emailVerified: true },
	});

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

	const trialClaimedAt = await claimTrial(deps.db, actor.userId);

	if (trialClaimedAt) {
		// Starting the trial is what switches enforcement on, atomically with
		// the subscription row it depends on. A trial that could not start —
		// billing switched off, a Stripe outage, no price tagged as the trial
		// tier — leaves a working organization and a log line, never a
		// brand-new organization that is read-only for a reason its owner can
		// neither see nor fix (ADR-0009, ADR-0001). `startTrial` reports a trial
		// Stripe created as started even when recording it failed, so a throw
		// or `null` here means no trial exists and the claim is handed back.
		let trial: TrialStarted | null = null;

		try {
			trial = await deps.startTrial(organization.id);
		} catch (error) {
			logger.error("Could not start a trial for a new organization", {
				organizationId: organization.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		if (!trial) {
			await releaseTrialClaim(deps.db, actor.userId, trialClaimedAt);
		}
	} else {
		// Their one trial is spent. This organization is unentitled from the
		// start and deliberately so — read-only until it subscribes, which is a
		// state its owner can see and act on, unlike the failures above.
		// Checkout stays open to them precisely because there is no
		// subscription yet.
		await billingRepository.setBillingEnforced(deps.db, organization.id, true);

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
