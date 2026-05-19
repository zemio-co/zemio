import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
	protectedProcedure,
} from "@/server/api/trpc";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
	deleteFilesFromStorage,
	getFileExtension,
	getPresignedDownloadUrl,
	getPresignedUploadUrl,
} from "@/server/storage";

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

	getBatchDownloadUrls: orgAdminProcedure
		.input(
			z.object({
				ids: z
					.array(z.string().min(1))
					.min(1)
					.max(100)
					.refine((ids) => new Set(ids).size === ids.length, {
						message: "Attachment ids must be unique",
					}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const attachments = await ctx.db.attachment.findMany({
				where: {
					id: {
						in: input.ids,
					},
					expense: {
						report: {
							organizationId: ctx.organizationId,
						},
					},
				},
				select: {
					id: true,
					key: true,
					originalName: true,
				},
			});

			if (attachments.length !== input.ids.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "One or more attachments were not found",
				});
			}

			const attachmentsById = new Map(
				attachments.map((attachment) => [attachment.id, attachment]),
			);

			const files = await Promise.all(
				input.ids.map(async (id) => {
					const attachment = attachmentsById.get(id);

					if (!attachment) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "One or more attachments were not found",
						});
					}

					const url = await getPresignedDownloadUrl(
						attachment.key,
						attachment.originalName,
					);

					return {
						id: attachment.id,
						filename: attachment.originalName,
						url,
					};
				}),
			);

			return { files };
		}),

	getUploadUrls: orgProcedure
		.input(
			z.object({
				files: z
					.array(
						z.object({
							name: z.string().min(1),
							contentType: z.string().min(1),
							size: z
								.number()
								.int()
								.nonnegative()
								.max(5 * 1024 * 1024, "File exceeds the 5 MB size limit"),
						}),
					)
					.min(1)
					.max(5),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const presignedUrls = await Promise.all(
				input.files.map(async (file) => {
					const extension = getFileExtension(file.name);
					const uniqueFilename = extension
						? `${crypto.randomUUID()}.${extension}`
						: crypto.randomUUID();
					const key = `attachment/${ctx.organizationId}/${uniqueFilename}`;
					const url = await getPresignedUploadUrl(key, file.contentType, file.size);
					return { url, key };
				}),
			);

			return { presignedUrls };
		}),

	deletePendingUploads: orgProcedure
		.input(
			z.object({
				keys: z
					.array(
						z
							.string()
							.regex(/^attachment\/[^/]+\/[^/]+$/, "Invalid attachment key format"),
					)
					.max(5),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const organizationKeyPrefix = `attachment/${ctx.organizationId}/`;
			const hasInvalidKey = input.keys.some(
				(key) => !key.startsWith(organizationKeyPrefix),
			);

			if (hasInvalidKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "One or more attachment keys do not belong to this organization",
				});
			}

			try {
				await deleteFilesFromStorage(input.keys);
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to clean up uploaded attachments",
				});
			}

			return { deletedKeys: input.keys };
		}),
});
