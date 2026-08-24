import "server-only";
import type { PrismaClient } from "@zemio/db";
import {
	emailDomain,
	type JoiningRuleFacts,
	type PersonSignals,
} from "./joining.policy";

/**
 * Reads and writes for joining. Every decision lives in joining.policy.ts;
 * this narrows the database to the rows that decision could possibly care
 * about.
 */

/**
 * The rules that could match this person.
 *
 * The query narrows by matcher and {@link matchesPerson} has the final say —
 * the email-domain rules this returns are still refused for an unverified
 * address. Filtering on verification here as well would put the same rule in
 * two places, and the one that matters is the pure one.
 *
 * It narrows on the *stored* form, which the schema requires to be lowercased:
 * a rule written with any uppercase in its value is invisible here however
 * tolerantly {@link matchesPerson} would compare it. Anything that comes to
 * write a rule has to lowercase its value, as
 * `organizationRepository.tenantRule` does.
 */
export async function findCandidateRules(
	db: PrismaClient,
	signals: PersonSignals,
): Promise<JoiningRuleFacts[]> {
	const matchers: { type: "MS_TENANT" | "EMAIL_DOMAIN"; value: string }[] = [];

	if (signals.microsoftTenantId) {
		matchers.push({
			type: "MS_TENANT",
			value: signals.microsoftTenantId.toLowerCase(),
		});
	}

	const domain = emailDomain(signals.email);
	if (domain) {
		matchers.push({ type: "EMAIL_DOMAIN", value: domain });
	}

	if (matchers.length === 0) return [];

	return db.joiningRule.findMany({
		where: { OR: matchers },
		select: {
			organizationId: true,
			type: true,
			value: true,
			mode: true,
		},
	});
}

/** The organizations this person is already a member of. */
export async function findMembershipOrganizationIds(
	db: PrismaClient,
	userId: string,
): Promise<string[]> {
	const members = await db.member.findMany({
		where: { userId },
		select: { organizationId: true },
	});

	return members.map((member) => member.organizationId);
}

/**
 * Joins a person to organizations they are not yet in.
 *
 * `skipDuplicates` rather than a check-then-insert: two concurrent logins race
 * here, and the unique constraint on (userId, organizationId) is the only real
 * guard against a duplicate member.
 *
 * Returns how many rows were actually inserted, which is not the same as how
 * many were asked for — the concurrent login that lost the race skips them all
 * and must not then report them as joined.
 */
export async function createMemberships(
	db: PrismaClient,
	userId: string,
	organizationIds: readonly string[],
): Promise<number> {
	if (organizationIds.length === 0) return 0;

	const { count } = await db.member.createMany({
		data: organizationIds.map((organizationId) => ({
			id: crypto.randomUUID(),
			userId,
			organizationId,
			role: "member",
			createdAt: new Date(),
		})),
		skipDuplicates: true,
	});

	return count;
}

/**
 * Pending invitations addressed to this person, newest first.
 *
 * Matched exactly, which is safe because Better Auth lowercases an invitation's
 * address before storing it (`crud-invites.mjs`) and this lowercases the
 * address it is given. Said out loud because it is an invariant another
 * package maintains: a case-insensitive match here would be immune to it, at
 * the cost of the index on `invitation.email`.
 */
export async function findPendingInvitations(db: PrismaClient, email: string) {
	return db.invitation.findMany({
		where: {
			email: email.toLowerCase(),
			status: "pending",
			expiresAt: { gt: new Date() },
		},
		select: {
			id: true,
			email: true,
			expiresAt: true,
			organization: { select: { id: true, name: true, logo: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

/**
 * One invitation, as the link that carries it needs to describe it.
 *
 * Read from Zemio's own tables rather than through Better Auth's
 * `getInvitation`, which refuses on the same email mismatch this is here to
 * explain.
 */
export async function findInvitationById(db: PrismaClient, id: string) {
	return db.invitation.findUnique({
		where: { id },
		select: {
			id: true,
			email: true,
			status: true,
			expiresAt: true,
			organization: { select: { name: true } },
		},
	});
}
