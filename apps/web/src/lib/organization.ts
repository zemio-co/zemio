export function isOrganizationAdminRole(
	role: string | null | undefined,
): boolean {
	return role === "admin" || role === "owner";
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
