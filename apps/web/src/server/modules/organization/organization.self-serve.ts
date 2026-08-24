import "server-only";

/**
 * Who may create an organization for themselves.
 *
 * Pure, and separate from the procedure that enforces it, because the same
 * rule is checked twice: once to tell somebody why they cannot, and once to
 * refuse them if they ask anyway.
 */

/** Why a person may not create an organization right now. */
export type SelfServeRefusal = "email_not_verified" | "trial_in_progress";

export type SelfServeFacts = {
	/** Verified by Zemio, never by an identity provider (ADR-0008). */
	emailVerified: boolean;
	/** Organizations this person owns whose subscription is still trialing. */
	trialingOrganizations: number;
};

/**
 * Returns why this person may not create an organization, or `null` if they
 * may.
 *
 * One trial at a time, not one organization: somebody genuinely running two
 * initiatives may create a second organization, it just starts unentitled and
 * has to subscribe (ADR-0009).
 */
export function refuseSelfServeCreation(
	facts: SelfServeFacts,
): SelfServeRefusal | null {
	if (!facts.emailVerified) return "email_not_verified";
	if (facts.trialingOrganizations > 0) return "trial_in_progress";
	return null;
}
