import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { NO_COST_UNIT_GROUP } from "@/lib/consts";
import {
	createCostUnitGroupSchema,
	createCostUnitSchema,
	deleteCostUnitGroupSchema,
	deleteCostUnitSchema,
	updateCostUnitGroupSchema,
	updateCostUnitSchema,
} from "@/lib/validators";
import { createTRPCRouter, orgAdminProcedure, orgProcedure } from "../trpc";

/**
 * Checks if an error is a Prisma unique constraint violation
 */
function isPrismaUniqueConstraintError(
	error: unknown,
): error is { code: string; meta?: { target?: string[] } } {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: string }).code === "P2002"
	);
}

export const costUnitRouter = createTRPCRouter({
	listCostUnits: orgProcedure
		.input(
			z.object({
				cursor: z.string().optional(),
				pageSize: z.number().min(1).max(200).default(20),
				search: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { cursor, pageSize, search } = input;

			const where = {
				organizationId: ctx.organizationId,
				...(search
					? {
							OR: [
								{ title: { contains: search, mode: "insensitive" as const } },
								{ tag: { contains: search, mode: "insensitive" as const } },
							],
						}
					: {}),
			};

			const items = await ctx.db.costUnit.findMany({
				where,
				take: pageSize + 1,
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: { tag: "asc" },
				select: {
					id: true,
					tag: true,
					title: true,
					examples: true,
					costUnitGroupId: true,
				},
			});

			let nextCursor: string | undefined;
			if (items.length > pageSize) {
				const nextItem = items.pop();
				nextCursor = nextItem?.id;
			}

			return { items, nextCursor };
		}),

	listGroupsWithUnits: orgProcedure.query(async ({ ctx }) => {
		const [groups, ungroupedCostUnits] = await ctx.db.$transaction([
			ctx.db.costUnitGroup.findMany({
				where: {
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
					title: true,
					costUnits: {
						select: {
							id: true,
							title: true,
							tag: true,
							examples: true,
						},
						orderBy: { tag: "asc" },
					},
				},
				orderBy: { title: "asc" },
			}),
			ctx.db.costUnit.findMany({
				where: {
					organizationId: ctx.organizationId,
					costUnitGroupId: null,
				},
				select: {
					id: true,
					title: true,
					tag: true,
					examples: true,
				},
				orderBy: { tag: "asc" },
			}),
		]);

		if (ungroupedCostUnits.length > 0) {
			return [
				{
					id: NO_COST_UNIT_GROUP,
					title: "Ohne Gruppe",
					costUnits: ungroupedCostUnits,
				},
				...groups,
			];
		}

		return groups;
	}),
	listGrouped: orgProcedure.query(async ({ ctx }) => {
		const costUnits = await ctx.db.costUnit.findMany({
			where: {
				organizationId: ctx.organizationId,
			},
			include: {
				costUnitGroup: true,
			},
			orderBy: [{ costUnitGroup: { title: "asc" } }, { tag: "asc" }],
		});

		// Group cost units by their group
		const ungrouped: typeof costUnits = [];
		const grouped = new Map<
			string,
			{
				group: (typeof costUnits)[0]["costUnitGroup"];
				costUnits: typeof costUnits;
			}
		>();

		for (const costUnit of costUnits) {
			if (!costUnit.costUnitGroup) {
				ungrouped.push(costUnit);
			} else {
				const existing = grouped.get(costUnit.costUnitGroup.id);
				if (existing) {
					existing.costUnits.push(costUnit);
				} else {
					grouped.set(costUnit.costUnitGroup.id, {
						group: costUnit.costUnitGroup,
						costUnits: [costUnit],
					});
				}
			}
		}

		return {
			ungrouped,
			grouped: Array.from(grouped.values()),
		};
	}),

	listGroups: orgProcedure.query(async ({ ctx }) => {
		return await ctx.db.costUnitGroup.findMany({
			where: {
				organizationId: ctx.organizationId,
			},
			orderBy: { title: "asc" },
		});
	}),

	create: orgAdminProcedure
		.input(createCostUnitSchema)
		.mutation(async ({ ctx, input }) => {
			const shouldConnectGroup =
				input.costUnitGroupId.length > 0 &&
				input.costUnitGroupId !== NO_COST_UNIT_GROUP;

			if (shouldConnectGroup) {
				const costUnitGroup = await ctx.db.costUnitGroup.findFirst({
					where: {
						id: input.costUnitGroupId,
						organizationId: ctx.organizationId,
					},
					select: {
						id: true,
					},
				});

				if (!costUnitGroup) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Kostenstellengruppe nicht gefunden.",
					});
				}
			}

			try {
				return await ctx.db.costUnit.create({
					data: {
						tag: input.tag,
						title: input.title,
						examples: input.examples,
						organizationId: ctx.organizationId,
						costUnitGroupId: shouldConnectGroup ? input.costUnitGroupId : null,
					},
				});
			} catch (error) {
				if (isPrismaUniqueConstraintError(error)) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Eine Kostenstelle mit diesem Tag existiert bereits.",
					});
				}
				throw error;
			}
		}),

	update: orgAdminProcedure
		.input(updateCostUnitSchema)
		.mutation(async ({ ctx, input }) => {
			const shouldConnectGroup =
				input.costUnitGroupId.length > 0 &&
				input.costUnitGroupId !== NO_COST_UNIT_GROUP;

			const existingCostUnit = await ctx.db.costUnit.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
				},
			});

			if (!existingCostUnit) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kostenstelle nicht gefunden.",
				});
			}

			if (shouldConnectGroup) {
				const costUnitGroup = await ctx.db.costUnitGroup.findFirst({
					where: {
						id: input.costUnitGroupId,
						organizationId: ctx.organizationId,
					},
					select: {
						id: true,
					},
				});

				if (!costUnitGroup) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Kostenstellengruppe nicht gefunden.",
					});
				}
			}

			try {
				return await ctx.db.costUnit.update({
					where: { id: input.id },
					data: {
						tag: input.tag,
						title: input.title,
						examples: input.examples,
						costUnitGroupId: shouldConnectGroup ? input.costUnitGroupId : null,
					},
				});
			} catch (error) {
				if (isPrismaUniqueConstraintError(error)) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Eine Kostenstelle mit diesem Tag existiert bereits.",
					});
				}
				throw error;
			}
		}),

	delete: orgAdminProcedure
		.input(deleteCostUnitSchema)
		.mutation(async ({ ctx, input }) => {
			const existingCostUnit = await ctx.db.costUnit.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
				},
			});

			if (!existingCostUnit) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kostenstelle nicht gefunden.",
				});
			}

			return await ctx.db.costUnit.delete({
				where: { id: input.id },
			});
		}),

	createGroup: orgAdminProcedure
		.input(createCostUnitGroupSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await ctx.db.costUnitGroup.create({
					data: {
						title: input.title,
						organizationId: ctx.organizationId,
					},
				});
			} catch (error) {
				if (isPrismaUniqueConstraintError(error)) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Eine Kostenstellengruppe mit diesem Titel existiert bereits.",
					});
				}
				throw error;
			}
		}),

	updateGroup: orgAdminProcedure
		.input(updateCostUnitGroupSchema)
		.mutation(async ({ ctx, input }) => {
			const existingGroup = await ctx.db.costUnitGroup.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
				},
			});

			if (!existingGroup) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kostenstellengruppe nicht gefunden.",
				});
			}

			try {
				return await ctx.db.costUnitGroup.update({
					where: { id: input.id },
					data: {
						title: input.title,
					},
				});
			} catch (error) {
				if (isPrismaUniqueConstraintError(error)) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Eine Kostenstellengruppe mit diesem Titel existiert bereits.",
					});
				}
				throw error;
			}
		}),

	deleteGroup: orgAdminProcedure
		.input(deleteCostUnitGroupSchema)
		.mutation(async ({ ctx, input }) => {
			const existingGroup = await ctx.db.costUnitGroup.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.organizationId,
				},
				select: {
					id: true,
				},
			});

			if (!existingGroup) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kostenstellengruppe nicht gefunden.",
				});
			}

			return await ctx.db.costUnitGroup.delete({
				where: { id: input.id },
			});
		}),
});
