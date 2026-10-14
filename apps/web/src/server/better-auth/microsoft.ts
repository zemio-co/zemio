/**
 * What a Microsoft id_token says about the person holding it.
 *
 * Pure and free of Better Auth, because these decide whether an email address
 * is trusted (ADR-0010) and that has to be testable without an auth
 * configuration, a database, or an identity provider.
 */

/**
 * The tenant every personal Microsoft account signs in under.
 *
 * A fixed, documented GUID — Microsoft calls it the "consumers" tenant. A
 * personal account has no administrator and no verified domain, so nothing it
 * says about an address is evidence (ADR-0010).
 */
export const MICROSOFT_CONSUMER_TENANT_ID =
	"9188040d-6c67-4c5b-b112-36a304b66dad";

/**
 * Decodes the payload of a Microsoft JWT id_token, without re-verification —
 * better-auth has already verified the token. Null for anything that is not a
 * token with an object payload.
 */
export function decodeMicrosoftIdToken(
	idToken: string,
): Record<string, unknown> | null {
	try {
		const payloadBase64 = idToken.split(".")[1];
		if (!payloadBase64) return null;

		const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
		const payload: unknown = JSON.parse(payloadJson);

		return typeof payload === "object" && payload !== null
			? (payload as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

/**
 * Whether this tenant is a work or school tenant.
 *
 * Necessary for {@link isDomainVerifiedWorkAccount} and not sufficient: a
 * tenant administrator can give a user any address, so the tenant alone says
 * nothing about whether the address is theirs to give.
 *
 * No tenant at all is not a work account: the claim is missing on a token this
 * code failed to read, and a missing claim must never read as proof.
 */
export function isWorkAccountTenant(tenantId: string | null): boolean {
	if (tenantId === null || tenantId.trim() === "") return false;

	return tenantId.toLowerCase() !== MICROSOFT_CONSUMER_TENANT_ID;
}

/**
 * Whether a Microsoft id_token proves `email` the way a verification mail would
 * (ADR-0010).
 *
 * Proof is `xms_edov` — "email domain owner verified" — which Microsoft sets
 * only when the address belongs to the user's own tenant and that tenant's
 * administrator has verified the domain. The `email` claim on its own is
 * tenant-mutable and never verified by Microsoft; trusting it is the "nOAuth"
 * account takeover, where somebody sets a victim's address on a user in a
 * tenant of their own.
 *
 * The claim is optional and has to be enabled on the app registration. A token
 * without it is refused, so a registration that lacks it falls back to the
 * verification mail rather than to trust. Only the boolean `true` counts.
 *
 * And the claim vouches for the token's own address, so it proves `email` only
 * when the two are the same address.
 */
export function isDomainVerifiedWorkAccount(
	claims: Record<string, unknown>,
	email: string,
): boolean {
	const tid = typeof claims.tid === "string" ? claims.tid : null;
	if (!isWorkAccountTenant(tid)) return false;
	if (claims.xms_edov !== true) return false;

	const claimedEmail = typeof claims.email === "string" ? claims.email : "";
	if (claimedEmail.trim() === "") return false;

	return claimedEmail.toLowerCase() === email.toLowerCase();
}
