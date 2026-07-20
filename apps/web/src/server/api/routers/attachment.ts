import { z } from "zod";
import {
	createTRPCRouter,
	orgAdminProcedure,
	orgProcedure,
} from "@/server/api/trpc";
import {
	attachmentProcedure,
	attachmentService,
	toAttachmentServiceContext,
} from "@/server/modules/attachment/";
import { expenseProcedure } from "@/server/modules/expense";
import { reportProcedure } from "@/server/modules/report";

export const attachmentRouter = createTRPCRouter({
	list: expenseProcedure("read").query(({ ctx }) =>
		attachmentService.list(toAttachmentServiceContext(ctx), ctx.expense),
	),

	listForReport: reportProcedure("read").query(({ ctx }) =>
		attachmentService.listForReport(
			toAttachmentServiceContext(ctx),
			ctx.report.id,
		),
	),

	getDownloadUrl: attachmentProcedure("read").mutation(({ ctx }) =>
		attachmentService.getDownloadUrl(ctx.attachment),
	),

	getBatchDownloadUrls: orgAdminProcedure
		.input(
			z.object({
				ids: z
					.array(z.string().min(1))
					.min(1)
					.max(100)
					.refine((ids) => new Set(ids).size === ids.length, {
						message: "Anhang-IDs müssen eindeutig sein",
					}),
			}),
		)
		.mutation(({ ctx, input }) =>
			attachmentService.getBatchDownloadUrls(
				toAttachmentServiceContext(ctx),
				input,
			),
		),

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
								.max(5 * 1024 * 1024, "Datei überschreitet das 5-MB-Limit"),
						}),
					)
					.min(1)
					.max(5),
			}),
		)
		.mutation(({ ctx, input }) =>
			attachmentService.getUploadUrls(toAttachmentServiceContext(ctx), input),
		),

	addToExpense: expenseProcedure("addAttachment")
		.input(
			z.object({
				attachments: z
					.array(
						z.object({
							key: z
								.string()
								.regex(
									/^attachment\/[^/]+\/[^/]+$/,
									"Ungültiges Anhang-Schlüsselformat",
								),
							size: z
								.number()
								.int()
								.nonnegative()
								.max(5 * 1024 * 1024),
							originalName: z.string().min(1),
						}),
					)
					.min(1)
					.max(5),
			}),
		)
		.mutation(({ ctx, input }) =>
			attachmentService.addToExpense(
				toAttachmentServiceContext(ctx),
				ctx.expense,
				input,
			),
		),

	delete: attachmentProcedure("delete").mutation(({ ctx }) =>
		attachmentService.delete(toAttachmentServiceContext(ctx), ctx.attachment),
	),

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
		.mutation(({ ctx, input }) =>
			attachmentService.deletePendingUploads(
				toAttachmentServiceContext(ctx),
				input,
			),
		),
});
