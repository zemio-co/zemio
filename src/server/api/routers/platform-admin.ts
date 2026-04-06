import { z } from "zod";
import { createOrganizationSlug } from "@/lib/organization";
import { createTRPCRouter, platformAdminProcedure } from "@/server/api/trpc";

export const platformAdminRouter = createTRPCRouter({
	listOrganizations: platformAdminProcedure.query(async ({ ctx }) => {
		return ctx.db.organization.findMany({
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				name: true,
				slug: true,
				microsoftTenantId: true,
				createdAt: true,
				_count: {
					select: { members: true },
				},
			},
		});
	}),

	createOrganization: platformAdminProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				microsoftTenantId: z
					.string()
					.uuid(
						"Microsoft Tenant ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
					),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const slug = createOrganizationSlug(input.name);

			const existing = await ctx.db.organization.findUnique({
				where: { slug },
				select: { id: true },
			});

			if (existing) {
				throw new Error(
					`An organization with the slug "${slug}" already exists. Choose a different name.`,
				);
			}

			return ctx.db.organization.create({
				data: {
					id: crypto.randomUUID(),
					name: input.name,
					slug,
					microsoftTenantId: input.microsoftTenantId,
					createdAt: new Date(),
				},
			});
		}),

	updateOrganizationTenantId: platformAdminProcedure
		.input(
			z.object({
				organizationId: z.string().min(1),
				microsoftTenantId: z
					.string()
					.uuid(
						"Microsoft Tenant ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
					)
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.organization.update({
				where: { id: input.organizationId },
				data: { microsoftTenantId: input.microsoftTenantId },
			});
		}),
});
