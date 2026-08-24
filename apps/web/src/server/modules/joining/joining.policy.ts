import type { JoiningRuleMode, JoiningRuleType } from "@zemio/db";

/**
 * Which organizations are open to a person, and on what evidence.
 *
 * Pure functions, deliberately: this decides who is admitted to an
 * organization's expense and banking data, and it needs to be testable without
 * a database, a session, or an identity provider.
 */

/** What a person brings to the question. Nothing here is taken on trust. */
export type PersonSignals = {
	email: string;
	/**
	 * Whether Zemio has itself confirmed the address. An address asserted by an
	 * identity provider is not verified, however it arrived (ADR-0008).
	 */
	emailVerified: boolean;
	/** The `tid` claim, when the person signed in with Microsoft. */
	microsoftTenantId: string | null;
};

/** The only rule facts a matching decision reads. */
export type JoiningRuleFacts = {
	organizationId: string;
	type: JoiningRuleType;
	value: string;
	mode: JoiningRuleMode;
};

/**
 * The domain part of an address, lowercased.
 *
 * Splits on the *last* `@`: the local part may legitimately contain one, and
 * taking the first would let `evil@attacker.com@uni.de` read as `uni.de`.
 */
export function emailDomain(email: string): string | null {
	const at = email.lastIndexOf("@");
	if (at === -1) return null;

	const domain = email
		.slice(at + 1)
		.trim()
		.toLowerCase();
	return domain === "" ? null : domain;
}

/**
 * Whether a rule admits this person.
 *
 * The two implemented types differ in what they trust, and that difference is
 * the point (ADR-0008). `MS_TENANT` reads `tid`, a GUID inside a signed token,
 * so it needs no verified address. `EMAIL_DOMAIN` reads the address itself,
 * which carries no proof, so it needs one.
 */
export function matchesPerson(
	rule: JoiningRuleFacts,
	signals: PersonSignals,
): boolean {
	switch (rule.type) {
		case "MS_TENANT":
			return (
				signals.microsoftTenantId !== null &&
				signals.microsoftTenantId.toLowerCase() === rule.value.toLowerCase()
			);

		case "EMAIL_DOMAIN": {
			if (!signals.emailVerified) return false;

			const domain = emailDomain(signals.email);
			return domain !== null && domain === rule.value.toLowerCase();
		}

		// Reserved. Returning false rather than throwing keeps a rule written by
		// a future release from breaking today's login.
		case "SSO_CONNECTION":
			return false;

		default:
			return false;
	}
}

/**
 * The organizations this person should be joined to during session creation.
 *
 * Only `AUTO_JOIN`. A matching `REQUEST` rule is deliberately dropped: the mode
 * is modelled so that adding it later is not a migration of live rows, and
 * treating it as auto-join in the meantime would admit people an administrator
 * expected to approve.
 */
export function organizationsToAutoJoin(
	rules: readonly JoiningRuleFacts[],
	signals: PersonSignals,
): string[] {
	const organizationIds = new Set<string>();

	for (const rule of rules) {
		if (rule.mode !== "AUTO_JOIN") continue;
		if (!matchesPerson(rule, signals)) continue;
		organizationIds.add(rule.organizationId);
	}

	return [...organizationIds];
}

/** One membership, as far as choosing an active organization is concerned. */
export type MembershipFacts = {
	organizationId: string;
	createdAt: Date;
};

/**
 * Which organization a session should open in.
 *
 * Prefers the one the person was last working in, which is the whole reason
 * `User.lastActiveOrganizationId` exists: without it someone who has just
 * created an organization is returned to whichever they joined first at their
 * next login, which is the most confusing possible moment for it to happen.
 *
 * The remembered organization is only honoured while they are still a member of
 * it. Opening a session against an organization they were removed from would
 * put every org procedure into refusing a person who has done nothing wrong.
 */
export function chooseActiveOrganization(
	lastActiveOrganizationId: string | null,
	memberships: readonly MembershipFacts[],
): string | null {
	if (memberships.length === 0) return null;

	if (
		lastActiveOrganizationId !== null &&
		memberships.some(
			(membership) => membership.organizationId === lastActiveOrganizationId,
		)
	) {
		return lastActiveOrganizationId;
	}

	const earliest = memberships.reduce((oldest, candidate) =>
		candidate.createdAt < oldest.createdAt ? candidate : oldest,
	);

	return earliest.organizationId;
}

/** What an invitation link can show the person who opened it. */
export type InvitationGate =
	| "ready"
	| "wrong_account"
	| "needs_verification"
	| "unavailable";

/**
 * What to show someone who opened an invitation link.
 *
 * Better Auth enforces the same rules when the invitation is actually
 * accepted; this decides what to *say* beforehand. The refusal it raises —
 * "you are not the recipient of the invitation" — is accurate and useless: it
 * never names the address that would work, and someone signed in with the
 * wrong one of their two university accounts has no way to find out.
 *
 * A mismatch outranks a missing verification, because verifying the address
 * they are signed in with would not help — it is not the address the
 * invitation was sent to.
 */
export function gateInvitation(
	invitation: { email: string; status: string; expiresAt: Date } | null,
	viewer: { email: string; emailVerified: boolean },
	now: Date,
): InvitationGate {
	if (!invitation) return "unavailable";
	if (invitation.status !== "pending") return "unavailable";
	if (invitation.expiresAt <= now) return "unavailable";

	if (invitation.email.toLowerCase() !== viewer.email.toLowerCase()) {
		return "wrong_account";
	}

	if (!viewer.emailVerified) return "needs_verification";

	return "ready";
}
