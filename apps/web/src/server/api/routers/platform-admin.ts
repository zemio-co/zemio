import { z } from "zod";
import { createOrganizationSlug } from "@/lib/organization";
import { createTRPCRouter, platformAdminProcedure } from "@/server/api/trpc";

const organizationIdSchema = z.object({
	organizationId: z.string().min(1),
});

const organizationSlugSchema = z
	.string()
	.min(1, "Slug ist erforderlich")
	.max(100, "Slug darf höchstens 100 Zeichen lang sein")
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		'Slug darf nur Kleinbuchstaben, Zahlen und "-" enthalten',
	);

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

	getOrganizationDetails: platformAdminProcedure
		.input(organizationIdSchema)
		.query(async ({ ctx, input }) => {
			return ctx.db.organization.findUnique({
				where: { id: input.organizationId },
				select: {
					id: true,
					name: true,
					slug: true,
					logo: true,
					metadata: true,
					microsoftTenantId: true,
					createdAt: true,
					settings: {
						select: {
							id: true,
							reviewerEmail: true,
							kilometerRate: true,
							costUnitInfoUrl: true,
							dailyFoodAllowance: true,
							breakfastDeduction: true,
							lunchDeduction: true,
							dinnerDeduction: true,
							updatedAt: true,
						},
					},
					members: {
						orderBy: [{ role: "asc" }, { createdAt: "asc" }],
						select: {
							id: true,
							role: true,
							createdAt: true,
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									image: true,
									role: true,
									microsoftTenantId: true,
								},
							},
						},
					},
					invitations: {
						orderBy: { createdAt: "desc" },
						select: {
							id: true,
							email: true,
							role: true,
							status: true,
							expiresAt: true,
							createdAt: true,
							inviter: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
					_count: {
						select: {
							members: true,
							invitations: true,
							reports: true,
							costUnits: true,
							costUnitGroups: true,
						},
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

	updateOrganization: platformAdminProcedure
		.input(
			z.object({
				organizationId: z.string().min(1),
				name: z.string().trim().min(1).max(100),
				slug: organizationSlugSchema,
				logo: z.url("Logo muss eine gültige URL sein").nullable(),
				metadata: z.string().trim().max(5000).nullable(),
				microsoftTenantId: z
					.string()
					.uuid(
						"Microsoft Tenant ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
					)
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db.organization.findFirst({
				where: {
					slug: input.slug,
					NOT: { id: input.organizationId },
				},
				select: { id: true },
			});

			if (existing) {
				throw new Error(
					`An organization with the slug "${input.slug}" already exists.`,
				);
			}

			return ctx.db.organization.update({
				where: { id: input.organizationId },
				data: {
					name: input.name,
					slug: input.slug,
					logo: input.logo,
					metadata: input.metadata,
					microsoftTenantId: input.microsoftTenantId,
				},
			});
		}),
});
