import { TRPCError } from "@trpc/server";
import z from "zod";
import { updateUserNameSchema } from "@/lib/validators";
import {
	createTRPCRouter,
	orgAdminProcedure,
	protectedProcedure,
} from "@/server/api/trpc";
import { auth } from "@/server/better-auth";

export const userRouter = createTRPCRouter({
	getOwn: protectedProcedure.query(async ({ ctx }) => {
		return await ctx.db.user.findUniqueOrThrow({
			where: { id: ctx.session.user.id },
			select: { id: true, name: true, email: true, image: true },
		});
	}),

	updateOwnName: protectedProcedure
		.input(updateUserNameSchema)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.user.update({
				where: { id: ctx.session.user.id },
				data: { name: input.name },
				select: { id: true, name: true, email: true, image: true },
			});
		}),

	setMemberRole: orgAdminProcedure
		.input(
			z.object({
				memberId: z.string(),
				role: z.enum(["admin", "member"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const target = await ctx.db.member.findFirst({
				where: {
					id: input.memberId,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
					role: true,
				},
			});

			if (!target) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			if (target.role === input.role) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Member already has this role",
				});
			}

			return await auth.api.updateMemberRole({
				headers: ctx.headers,
				body: {
					memberId: input.memberId,
					role: input.role,
					organizationId: ctx.organizationId,
				},
			});
		}),
});
