import type { Prisma } from "@zemio/db";
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
	getOrg: orgProcedure.query(async ({ ctx }) => {
		return await ctx.db.organization.findUniqueOrThrow({
			where: { id: ctx.organizationId },
		});
	}),

	updateOrgName: orgAdminProcedure
		.input(z.object({ name: z.string().min(1).max(100) }))
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.organization.update({
				where: { id: ctx.organizationId },
				data: { name: input.name },
				select: { id: true, name: true },
			});
		}),

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
	listMembers: orgAdminProcedure
		.input(
			z.object({
				pageSize: z.number().min(1).max(50).default(20),
				page: z.number().min(1).default(1),
				search: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { page, pageSize, search } = input;

			const where = search
				? {
						organizationId: ctx.organizationId,
						user: {
							name: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
					}
				: { organizationId: ctx.organizationId };

			const select: Prisma.MemberSelect = {
				id: true,
				createdAt: true,
				role: true,
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			};

			const [rows, total] = await Promise.all([
				ctx.db.member.findMany({
					where,
					select,
					skip: (page - 1) * pageSize,
					take: pageSize,
				}),
				ctx.db.member.count({ where }),
			]);

			return {
				rows,
				total,
				pageCount: Math.ceil(total / pageSize),
			};
		}),
	getMembershipDetails: orgAdminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { id: membershipId } = input;

			return await ctx.db.member.findUniqueOrThrow({
				where: {
					id: membershipId,
				},
				include: {
					user: true,
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
