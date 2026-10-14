import { z } from "zod";
import { updateUserNameSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { completeOnboarding } from "@/server/modules/onboarding";
import { toUserServiceContext, userService } from "@/server/modules/user";

export const userRouter = createTRPCRouter({
	get: protectedProcedure.query(({ ctx }) =>
		userService.get(toUserServiceContext(ctx)),
	),

	updateName: protectedProcedure
		.input(updateUserNameSchema)
		.mutation(({ ctx, input }) =>
			userService.updateName(toUserServiceContext(ctx), input),
		),

	/**
	 * Remembers which organization this person is working in, so their next
	 * session opens there.
	 *
	 * Called alongside Better Auth's `setActive`, which writes the session and
	 * not the user. Scoped to organizations they are actually a member of: the
	 * id arrives from the client, and a remembered organization they cannot
	 * enter would put every org procedure into refusing them at their next
	 * login.
	 */
	setLastActiveOrganization: protectedProcedure
		.input(z.object({ organizationId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const { count } = await ctx.db.user.updateMany({
				where: {
					id: ctx.session.user.id,
					members: { some: { organizationId: input.organizationId } },
				},
				data: { lastActiveOrganizationId: input.organizationId },
			});

			return { remembered: count > 0 };
		}),

	/**
	 * Ends onboarding for the founder who has reached its last page.
	 *
	 * Every other population is stamped by `resolveOnboarding`, which
	 * recognises completion from the facts. A founder's last step is a page
	 * being read, which no fact records — so this is the one place the flow is
	 * reported as finished rather than inferred.
	 *
	 * Takes no input and cannot finish anybody else's flow: the only thing it
	 * writes is keyed to the calling session, and the write is guarded on the
	 * column still being null.
	 */
	completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
		await completeOnboarding(ctx.db, ctx.session.user.id);
	}),
});
