import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
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
		.mutation(async ({ ctx, input }) => {
			const organization = await createSelfServeOrganization(
				{
					db: ctx.db,
					createOrganization: async ({ name, slug, userId }) => {
						const created = await auth.api.createOrganization({
							body: { name, slug, userId },
						});

						if (!created) {
							throw new TRPCError({
								code: "INTERNAL_SERVER_ERROR",
								message: "The organization could not be created.",
							});
						}

						return { id: created.id };
					},
					startTrial: (organizationId) => startTrialIfBilling(ctx, organizationId),
				},
				{ userId: ctx.session.user.id },
				input,
			);

			// A system action has no session to switch, so Better Auth writes the
			// owner member and leaves this session pointing at nothing. Remembering
			// it on the user only opens the organization at the *next* login; this
			// is what opens it now, and without it the person lands on a dashboard
			// where every org procedure refuses them.
			//
			// Not allowed to undo the creation: the organization exists either way,
			// and a failure here that read as "creation failed" would have them
			// create a second one.
			try {
				await auth.api.setActiveOrganization({
					headers: ctx.headers,
					body: { organizationId: organization.id },
				});
			} catch (error) {
				logger.error("Could not open the new organization in this session", {
					organizationId: organization.id,
					userId: ctx.session.user.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}

			return organization;
		}),
});
