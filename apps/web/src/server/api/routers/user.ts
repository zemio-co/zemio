import { z } from "zod";
import { updateUserNameSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
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
});
