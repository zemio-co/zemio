import "server-only";
import type { PrismaClient } from "@zemio/db";
import { logger } from "@/lib/logger";
import {
	chooseActiveOrganization,
	organizationsToAutoJoin,
	type PersonSignals,
} from "./joining.policy";
import * as repo from "./joining.repository";

/**
 * The one question onboarding asks: which organizations are open to this
 * person, and on what terms?
 *
 * Invitations and joining rules are separate tables — an invitation names one
 * person once and expires, a rule is standing and matches a property — but
 * they answer the same question, and this is where that answer is assembled.
 */

/**
 * Joins a person to every organization whose rule admits them automatically.
 *
 * Returns the organizations actually joined, which is empty for the common
 * case of somebody who was already a member of all of them.
 */
export async function applyAutoJoins(
	db: PrismaClient,
	userId: string,
	signals: PersonSignals,
): Promise<string[]> {
	const rules = await repo.findCandidateRules(db, signals);
	if (rules.length === 0) return [];

	const open = organizationsToAutoJoin(rules, signals);
	if (open.length === 0) return [];

	const existing = new Set(await repo.findMembershipOrganizationIds(db, userId));
	const toJoin = open.filter((organizationId) => !existing.has(organizationId));

	if (toJoin.length === 0) return [];

	await repo.createMemberships(db, userId, toJoin);

	logger.info("joining.auto_joined", {
		userId,
		organizationIds: toJoin,
	});

	return toJoin;
}

/** What a person with nowhere to go can act on. */
export type Openings = {
	invitations: Awaited<ReturnType<typeof repo.findPendingInvitations>>;
};

export async function resolveOpenings(
	db: PrismaClient,
	email: string,
): Promise<Openings> {
	return { invitations: await repo.findPendingInvitations(db, email) };
}

/**
 * The organization a newly created session should open in.
 *
 * Read after {@link applyAutoJoins}, so an organization joined during this very
 * login is a candidate rather than something the person only sees at their
 * next one.
 */
export async function resolveSessionOrganization(
	db: PrismaClient,
	userId: string,
): Promise<string | null> {
	const [user, memberships] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { lastActiveOrganizationId: true },
		}),
		db.member.findMany({
			where: { userId },
			select: { organizationId: true, createdAt: true },
		}),
	]);

	return chooseActiveOrganization(
		user?.lastActiveOrganizationId ?? null,
		memberships,
	);
}
