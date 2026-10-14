import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { createOrganizationSlug } from "@/lib/organization";
import { mapPrismaError } from "@/server/shared/errors";
import type {
	CreateOrganizationInput,
	UpdateOrganizationProfileInput,
} from "./organization.platform-validators";
import {
	type OrganizationDetail,
	type OrganizationRepository,
	type OrganizationRow,
	type OrganizationSummary,
	organizationRepository,
} from "./organization.repository";

/**
 * Platform-scoped organization use-cases. Deliberately separate from
 * organizationService, which is bound to the caller's active organization —
 * these operate across every tenant and are reachable only by a platform admin.
 */
export type PlatformOrganizationServiceContext = {
	db: PrismaClient;
};

export function createPlatformOrganizationService(deps: {
	repo: OrganizationRepository;
}) {
	const { repo } = deps;

	async function assertSlugAvailable(
		ctx: PlatformOrganizationServiceContext,
		args: { slug: string; excludeId?: string },
	): Promise<void> {
		const existing = await repo.findConflictingSlug(ctx.db, args);
		if (existing) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `An organization with the slug "${args.slug}" already exists.`,
			});
		}
	}

	return {
		list(
			ctx: PlatformOrganizationServiceContext,
		): Promise<OrganizationSummary[]> {
			return repo.listAll(ctx.db);
		},

		async byId(
			ctx: PlatformOrganizationServiceContext,
			input: { id: string },
		): Promise<OrganizationDetail> {
			const organization = await repo.findDetailById(ctx.db, input.id);
			if (!organization) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organization not found",
				});
			}
			return organization;
		},

		async create(
			ctx: PlatformOrganizationServiceContext,
			input: CreateOrganizationInput,
		): Promise<OrganizationRow> {
			const slug = createOrganizationSlug(input.name);
			await assertSlugAvailable(ctx, { slug });

			try {
				return await repo.create(ctx.db, {
					name: input.name,
					slug,
					microsoftTenantId: input.microsoftTenantId,
				});
			} catch (error) {
				throw mapPrismaError(error);
			}
		},

		async update(
			ctx: PlatformOrganizationServiceContext,
			organizationId: string,
			input: UpdateOrganizationProfileInput,
		): Promise<OrganizationRow> {
			await assertSlugAvailable(ctx, {
				slug: input.slug,
				excludeId: organizationId,
			});

			try {
				return await repo.update(ctx.db, {
					id: organizationId,
					data: {
						name: input.name,
						slug: input.slug,
						logo: input.logo,
						metadata: input.metadata,
					},
					microsoftTenantId: input.microsoftTenantId,
				});
			} catch (error) {
				throw mapPrismaError(error);
			}
		},
	};
}

export type PlatformOrganizationService = ReturnType<
	typeof createPlatformOrganizationService
>;

export const platformOrganizationService = createPlatformOrganizationService({
	repo: organizationRepository,
});
