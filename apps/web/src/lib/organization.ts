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
 * and the browser needs the same two strings: the procedure answers with a
 * marker so the page can say which of the two applies — one is fixed by
 * confirming an address, the other by waiting for a trial to end, and a single
 * `FORBIDDEN` cannot tell them apart.
 */
export const SELF_SERVE_REFUSAL = {
	email_not_verified: "EMAIL_NOT_VERIFIED",
	trial_in_progress: "TRIAL_IN_PROGRESS",
} as const;
