import { z } from "zod";

/**
 * Updating the organization profile. `logo` left undefined means "unchanged";
 * an explicit null clears it. That is what lets one endpoint serve both the
 * name-only form and the full general-settings form.
 */
export const updateOrganizationSchema = z.object({
	name: z.string().min(1).max(100),
	logo: z
		.preprocess(
			(val) => (val === "" ? null : val),
			z.url({ normalize: true }).nullable(),
		)
		.optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Creating an organization for yourself takes a name and nothing else.
 *
 * No tenant: a new organization is invite-only, and seeding a joining rule
 * from whoever created it would open its expense and banking data to everyone
 * in their Microsoft tenant without them choosing it (ADR-0008).
 */
export const createSelfServeOrganizationSchema = z.object({
	name: z.string().trim().min(1).max(100),
});

export type CreateSelfServeOrganizationInput = z.infer<
	typeof createSelfServeOrganizationSchema
>;
