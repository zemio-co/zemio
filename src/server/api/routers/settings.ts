import { z } from "zod";
import {
	updateMealAllowancesSchema,
	updateTravelAllowancesSchema,
} from "@/lib/validators";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
	publicProcedure,
} from "@/server/api/trpc";

export const settingsRouter = createTRPCRouter({
	get: orgProcedure.query(async ({ ctx }) => {
		const settings = await ctx.db.settings.upsert({
			where: { organizationId: ctx.organizationId },
			create: {
				organizationId: ctx.organizationId,
				kilometerRate: 0.3,
			},
			update: {},
		});

		return {
			...settings,
			kilometerRate: Number(settings.kilometerRate),
			dailyFoodAllowance: Number(settings.dailyFoodAllowance),
			breakfastDeduction: Number(settings.breakfastDeduction),
			lunchDeduction: Number(settings.lunchDeduction),
			dinnerDeduction: Number(settings.dinnerDeduction),
		};
	}),

	// Public settings for non-admin usage
	getPublic: publicProcedure.query(async ({ ctx }) => {
		const session = ctx.session;
		const organizationId = session?.session.activeOrganizationId;
		if (!organizationId) {
			return {
				costUnitInfoUrl: null,
			};
		}

		const settings = await ctx.db.settings.findUnique({
			where: { organizationId },
			select: {
				costUnitInfoUrl: true,
			},
		});

		return {
			costUnitInfoUrl: settings?.costUnitInfoUrl ?? null,
		};
	}),

	// Update settings (only admins)
	update: orgAdminProcedure
		.input(
			z.object({
				kilometerRate: z.number().positive().optional(),
				reviewerEmail: z.email().optional().nullable(),
				costUnitInfoUrl: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const settings = await ctx.db.settings.upsert({
				where: { organizationId: ctx.organizationId },
				create: {
					organizationId: ctx.organizationId,
					kilometerRate: input.kilometerRate ?? 0.3,
					reviewerEmail: input.reviewerEmail ?? null,
					costUnitInfoUrl: input.costUnitInfoUrl ?? null,
				},
				update: input,
			});

			return settings;
		}),
	listUsers: orgAdminProcedure.query(async ({ ctx }) => {
		return await ctx.db.member.findMany({
			where: {
				organizationId: ctx.organizationId,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
			orderBy: {
				createdAt: "asc",
			},
		});
	}),
	updateMealAllowances: orgAdminProcedure
		.input(updateMealAllowancesSchema)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.settings.upsert({
				where: { organizationId: ctx.organizationId },
				create: {
					organizationId: ctx.organizationId,
					...input,
				},
				update: input,
			});
		}),
	updateTravelAllowances: orgAdminProcedure
		.input(updateTravelAllowancesSchema)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.settings.upsert({
				where: { organizationId: ctx.organizationId },
				create: {
					organizationId: ctx.organizationId,
					...input,
				},
				update: input,
			});
		}),
});
