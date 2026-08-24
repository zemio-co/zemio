import "server-only";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { logger } from "@/lib/logger";
import { createOrganizationSlug } from "@/lib/organization";
import type { TrialStarted } from "@/server/modules/billing/billing.trial";
import {
	refuseSelfServeCreation,
	type SelfServeRefusal,
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

/** The refusal, as the interface needs to tell it apart from any other. */
export const SELF_SERVE_REFUSAL = {
	email_not_verified: "EMAIL_NOT_VERIFIED",
	trial_in_progress: "TRIAL_IN_PROGRESS",
} as const satisfies Record<SelfServeRefusal, string>;

/**
 * A slug nobody else holds.
 *
 * Two initiatives called Robotics is ordinary, and the second one never chose
 * the slug that collided — so it is given a distinct one rather than an error
 * about a name it did not pick.
 */
async function availableSlug(db: PrismaClient, name: string): Promise<string> {
	const base = createOrganizationSlug(name);

	const taken = await db.organization.findFirst({
		where: { slug: base },
		select: { id: true },
	});

	if (!taken) return base;

	return `${base}-${crypto.randomUUID().slice(0, 6)}`;
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
		trialingOrganizations,
	});

	if (refusal) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: SELF_SERVE_REFUSAL[refusal],
		});
	}

	const organization = await deps.createOrganization({
		name: input.name,
		slug: await availableSlug(deps.db, input.name),
		userId: actor.userId,
	});

	// Enforcement is switched on only once the trial exists. A trial that could
	// not start — billing switched off, a Stripe outage, no price tagged as the
	// trial tier — leaves a working organization and a log line, never a
	// brand-new organization that is read-only on arrival (ADR-0009, ADR-0001).
	try {
		const trial = await deps.startTrial(organization.id);

		if (trial) {
			await deps.db.organization.updateMany({
				where: { id: organization.id },
				data: { billingEnforced: true },
			});
		}
	} catch (error) {
		logger.error("Could not start a trial for a new organization", {
			organizationId: organization.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	// So the next session opens here rather than in whichever organization they
	// happened to join first.
	await deps.db.user.update({
		where: { id: actor.userId },
		data: { lastActiveOrganizationId: organization.id },
	});

	logger.info("organization.self_serve_created", {
		organizationId: organization.id,
		userId: actor.userId,
	});

	return organization;
}
