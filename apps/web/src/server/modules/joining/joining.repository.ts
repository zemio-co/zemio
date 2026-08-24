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
 * Deliberately a superset: the query narrows by matcher, and
 * {@link matchesPerson} has the final say — the email-domain rules it returns
 * are still refused for an unverified address. Filtering on verification here
 * as well would put the same rule in two places, and the one that matters is
 * the pure one.
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
 */
export async function createMemberships(
	db: PrismaClient,
	userId: string,
	organizationIds: readonly string[],
): Promise<void> {
	if (organizationIds.length === 0) return;

	await db.member.createMany({
		data: organizationIds.map((organizationId) => ({
			id: crypto.randomUUID(),
			userId,
			organizationId,
			role: "member",
			createdAt: new Date(),
		})),
		skipDuplicates: true,
	});
}

/** Pending invitations addressed to this person, newest first. */
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
