import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { getPresignedDownloadUrl } from "@/server/storage";

export const attachmentRouter = createTRPCRouter({
	listForReport: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const report = await ctx.db.report.findUnique({
				where: {
					id: input.id,
				},
				select: {
					organizationId: true,
					ownerId: true,
				},
			});

			if (!report) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			const hasPermission = await auth.api.hasPermission({
				headers: ctx.headers,
				body: {
					organizationId: report.organizationId,
					permissions: {
						report: ["readAll"],
					},
				},
			});

			if (!hasPermission.success && report.ownerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
				});
			}

			return await db.attachment.findMany({
				where: {
					expense: {
						reportId: input.id,
					},
				},
			});
		}),

	getDownloadUrl: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const attachment = await ctx.db.attachment.findUnique({
				where: { id: input.id },
				select: {
					key: true,
					originalName: true,
					expense: {
						select: {
							report: {
								select: {
									ownerId: true,
									organizationId: true,
								},
							},
						},
					},
				},
			});

			if (!attachment) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const hasPermission = await auth.api.hasPermission({
				headers: ctx.headers,
				body: {
					organizationId: attachment.expense.report.organizationId,
					permissions: {
						report: ["readAll"],
					},
				},
			});

			const isOwner = attachment.expense.report.ownerId === ctx.session.user.id;

			if (!hasPermission.success && !isOwner) {
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			const url = await getPresignedDownloadUrl(
				attachment.key,
				attachment.originalName,
			);

			return { url };
		}),
});
