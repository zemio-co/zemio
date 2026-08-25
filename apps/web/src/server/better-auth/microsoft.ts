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
 * A fixed, documented GUID — Microsoft calls it the "consumers" tenant. It is
 * what separates an address administered by an organisation from one somebody
 * registered for themselves, which is the whole of the distinction ADR-0010
 * rests on.
 */
export const MICROSOFT_CONSUMER_TENANT_ID =
	"9188040d-6c67-4c5b-b112-36a304b66dad";

/**
 * Decodes the payload of a Microsoft JWT id_token (without re-verification —
 * better-auth has already verified the token) and extracts the `tid` claim,
 * which is the Microsoft Entra ID tenant identifier.
 */
export function extractMicrosoftTenantId(idToken: string): string | null {
	try {
		const payloadBase64 = idToken.split(".")[1];
		if (!payloadBase64) return null;

		const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
		const payload = JSON.parse(payloadJson) as Record<string, unknown>;

		return typeof payload.tid === "string" ? payload.tid : null;
	} catch {
		return null;
	}
}

/**
 * Whether this tenant is a work or school tenant.
 *
 * The one signal Zemio accepts in place of sending a mail (ADR-0010). A work
 * or school address exists because a tenant administrator created it and
 * proved the domain to Microsoft, so the tenant has already done what a
 * verification mail would do. A personal account has proved only that somebody
 * could read that mailbox once, at signup, under rules Zemio cannot see — and
 * an `EMAIL_DOMAIN` joining rule would hand them an organisation's expense and
 * banking data on the strength of it.
 *
 * No tenant at all is not a work account: the claim is missing on a token this
 * code failed to read, and a missing claim must never read as proof.
 */
export function isWorkAccountTenant(tenantId: string | null): boolean {
	if (tenantId === null || tenantId.trim() === "") return false;

	return tenantId.toLowerCase() !== MICROSOFT_CONSUMER_TENANT_ID;
}
