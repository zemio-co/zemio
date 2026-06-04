import { updatePreferencesServerSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const preferencesRouter = createTRPCRouter({
	getOwn: protectedProcedure.query(async ({ ctx }) => {
		let preferences = await ctx.db.preferences.findUnique({
			where: { userId: ctx.session.user.id },
		});

		if (!preferences) {
			preferences = await ctx.db.preferences.create({
				data: {
					userId: ctx.session.user.id,
					notifications: "ALL",
				},
			});
		}

		return preferences;
	}),
	updateOwn: protectedProcedure
		.input(updatePreferencesServerSchema)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.preferences.update({
				where: { userId: ctx.session.user.id },
				data: {
					notifications: input.notificationPreference,
				},
			});
		}),
});
