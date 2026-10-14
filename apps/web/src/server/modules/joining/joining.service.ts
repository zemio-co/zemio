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

	// A concurrent login for the same person can have inserted some or all of
	// these already, and those rows are skipped. Only what this call inserted is
	// reported, so the log names memberships it actually created.
	const joined = await repo.createMemberships(db, userId, toJoin);

	if (joined.length === 0) return [];

	logger.info("joining.auto_joined", { userId, organizationIds: joined });

	return joined;
}

/**
 * Opens the person's organization in the sessions they already have open.
 *
 * The session hook that chooses an active organization runs when a session is
 * *created*, so a membership gained inside an existing session — by verifying
 * an address, or by a sign-in elsewhere — leaves the sessions already running
 * with none. Every organization-scoped call in them then refuses the person
 * until they log out and back in.
 *
 * Only sessions with no organization are touched, so this never moves someone
 * who is already working somewhere. The remembered choice on the user is
 * updated on the same terms, so the next login lands in the same place.
 * Idempotent, and writes nothing for somebody who belongs nowhere.
 */
export async function openJoinedOrganization(
	db: PrismaClient,
	userId: string,
): Promise<void> {
	const organizationId = await resolveSessionOrganization(db, userId);
	if (!organizationId) return;

	await db.$transaction([
		db.session.updateMany({
			where: { userId, activeOrganizationId: null },
			data: { activeOrganizationId: organizationId },
		}),
		db.user.updateMany({
			where: { id: userId, lastActiveOrganizationId: null },
			data: { lastActiveOrganizationId: organizationId },
		}),
	]);
}

/**
 * Applies joining rules once an address has been verified, and opens what the
 * person now belongs to in the sessions they have open.
 *
 * The opening does not depend on this call having joined anybody. Verification
 * commits the flag before this runs, so a sign-in elsewhere in that moment can
 * read it and insert the membership first; this call then inserts nothing,
 * and the session that verified would be left without an organization.
 * Whoever inserted the row, the person is in an organization now, and that is
 * what decides.
 */
export async function joinAfterVerification(
	db: PrismaClient,
	userId: string,
	signals: PersonSignals,
): Promise<void> {
	await applyAutoJoins(db, userId, signals);
	await openJoinedOrganization(db, userId);
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
