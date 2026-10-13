import "server-only";
import type { SelfServeRefusal } from "@/lib/organization";

/**
 * Who may create an organization for themselves.
 *
 * Pure, and separate from the procedure that enforces it, because the same
 * rule is checked twice: once to tell somebody why they cannot, and once to
 * refuse them if they ask anyway.
 */

export type { SelfServeRefusal };

export type SelfServeFacts = {
	/** Verified by Zemio, never by an identity provider (ADR-0008). */
	emailVerified: boolean;
};

/**
 * Returns why this person may not create an organization, or `null` if they
 * may.
 *
 * A verified address is the only bar. Having had a trial already is
 * deliberately not one: somebody genuinely running two initiatives may create
 * a second organization, it just does not come with a trial (ADR-0009).
 */
export function refuseSelfServeCreation(
	facts: SelfServeFacts,
): SelfServeRefusal | null {
	if (!facts.emailVerified) return "email_not_verified";
	return null;
}
