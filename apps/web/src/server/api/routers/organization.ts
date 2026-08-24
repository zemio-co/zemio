import { TRPCError } from "@trpc/server";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
	protectedProcedure,
} from "@/server/api/trpc";
import { auth } from "@/server/better-auth";
import { startTrialIfBilling } from "@/server/modules/billing";
import {
	createSelfServeOrganization,
	createSelfServeOrganizationSchema,
	organizationService,
	toOrganizationServiceContext,
	updateOrganizationSchema,
} from "@/server/modules/organization";

export const organizationRouter = createTRPCRouter({
	get: orgProcedure.query(({ ctx }) =>
		organizationService.get(toOrganizationServiceContext(ctx)),
	),

	update: orgAdminProcedure
		.input(updateOrganizationSchema)
		.mutation(({ ctx, input }) =>
			organizationService.update(toOrganizationServiceContext(ctx), input),
		),

	/**
	 * Creates an organization for the person asking, making them its owner.
	 *
	 * Better Auth's own create endpoint stays closed
	 * (`allowUserToCreateOrganization: false`), so this is the only way in and
	 * the eligibility rules cannot be stepped around by posting to it directly.
	 * Calling `auth.api` without headers is a system action, which is what lets
	 * a closed endpoint still be used from here — and it is Better Auth that
	 * writes the owner member, rather than this procedure remembering to.
	 */
	createSelfServe: protectedProcedure
		.input(createSelfServeOrganizationSchema)
		.mutation(({ ctx, input }) =>
			createSelfServeOrganization(
				{
					db: ctx.db,
					createOrganization: async ({ name, slug, userId }) => {
						const organization = await auth.api.createOrganization({
							body: { name, slug, userId },
						});

						if (!organization) {
							throw new TRPCError({
								code: "INTERNAL_SERVER_ERROR",
								message: "The organization could not be created.",
							});
						}

						return { id: organization.id };
					},
					startTrial: (organizationId) => startTrialIfBilling(ctx, organizationId),
				},
				{ userId: ctx.session.user.id },
				input,
			),
		),
});
