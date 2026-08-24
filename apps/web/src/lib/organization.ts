export function isOrganizationAdminRole(
	role: string | null | undefined,
): boolean {
	return role === "admin" || role === "owner";
}

/**
 * The single owner of an organization, as distinct from its administrators.
 *
 * Kept separate from {@link isOrganizationAdminRole} because the two answer
 * different questions: who may run the organization, and who may commit it to
 * paying for it.
 */
export function isOrganizationOwnerRole(
	role: string | null | undefined,
): boolean {
	return role === "owner";
}

export function createOrganizationSlug(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-]+|[-]+$/g, "");
}

/**
 * Why a person may not create an organization for themselves.
 *
 * Defined here rather than beside the rule because the rule is `server-only`
 * and the browser needs the same strings: the procedure answers with a marker
 * so the page can tell this `FORBIDDEN` from every other one the API raises,
 * and offer the one action that resolves it.
 */
export const SELF_SERVE_REFUSAL = {
	email_not_verified: "EMAIL_NOT_VERIFIED",
} as const;

/**
 * Why a person may not create an organization.
 *
 * Derived from the markers rather than declared beside them, so a reason
 * without a marker to travel as cannot be written in the first place.
 */
export type SelfServeRefusal = keyof typeof SELF_SERVE_REFUSAL;

/** Which refusal a failed creation carries, or null if it was something else. */
export function selfServeRefusalOf(error: unknown): SelfServeRefusal | null {
	if (typeof error !== "object" || error === null || !("message" in error)) {
		return null;
	}

	const message = (error as { message?: unknown }).message;

	const found = Object.entries(SELF_SERVE_REFUSAL).find(
		([, marker]) => marker === message,
	);

	return found ? (found[0] as SelfServeRefusal) : null;
}
