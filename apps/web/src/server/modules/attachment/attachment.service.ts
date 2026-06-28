import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zemio/db";
import { ExpenseType } from "@zemio/db";
import { type AuditRepository, auditRepository } from "@/server/modules/audit";
import type { ExpenseDetail } from "@/server/modules/expense/expense.repository";
import { mapPrismaError } from "@/server/shared/errors";
import {
	deleteFilesFromStorage,
	getFileExtension,
	getPresignedDownloadUrl,
	getPresignedUploadUrl,
} from "@/server/storage";
import type {
	AttachmentDetail,
	AttachmentRepository,
} from "./attachment.repository";
import { attachmentRepository } from "./attachment.repository";

async function transact<T>(
	db: PrismaClient,
	fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
	try {
		return await db.$transaction((tx) => fn(tx as unknown as PrismaClient));
	} catch (error) {
		throw mapPrismaError(error);
	}
}

export type AttachmentServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
	isOrgAdmin: boolean;
};

type AddToExpenseInput = {
	attachments: Array<{
		key: string;
		size: number;
		originalName: string;
	}>;
};

type GetUploadUrlsInput = {
	files: Array<{
		name: string;
		contentType: string;
		size: number;
	}>;
};

export function createAttachmentService(deps: {
	repo: AttachmentRepository;
	audit: AuditRepository;
}) {
	const { repo, audit } = deps;

	return {
		list(ctx: AttachmentServiceContext, expense: ExpenseDetail) {
			return repo.listForExpense(ctx.db, expense.id);
		},

		listForReport(ctx: AttachmentServiceContext, reportId: string) {
			return repo.listForReport(ctx.db, reportId);
		},

		async getDownloadUrl(
			attachment: Pick<AttachmentDetail, "key" | "originalName">,
		): Promise<{ url: string }> {
			const url = await getPresignedDownloadUrl(
				attachment.key,
				attachment.originalName,
			);
			return { url };
		},

		async getBatchDownloadUrls(
			ctx: AttachmentServiceContext,
			input: { ids: string[] },
		): Promise<{ files: Array<{ id: string; filename: string; url: string }> }> {
			const attachments = await repo.findManyByIds(ctx.db, {
				ids: input.ids,
				organizationId: ctx.organizationId,
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
					return { id: attachment.id, filename: attachment.originalName, url };
				}),
			);

			return { files };
		},

		async getUploadUrls(
			ctx: AttachmentServiceContext,
			input: GetUploadUrlsInput,
		): Promise<{ presignedUrls: Array<{ url: string; key: string }> }> {
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
		},

		async addToExpense(
			ctx: AttachmentServiceContext,
			expense: ExpenseDetail,
			input: AddToExpenseInput,
		) {
			if (expense.type !== ExpenseType.RECEIPT) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Attachments can only be added to receipt expenses",
				});
			}

			const currentCount = await repo.countForExpense(ctx.db, expense.id);
			const newTotal = currentCount + input.attachments.length;
			if (newTotal > 5) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Adding these attachments would exceed the 5-attachment limit (currently ${currentCount})`,
				});
			}

			const expectedKeyPrefix = `attachment/${ctx.organizationId}/`;
			const hasInvalidKey = input.attachments.some(
				(a) => !a.key.startsWith(expectedKeyPrefix),
			);
			if (hasInvalidKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "One or more attachment keys do not belong to this organization",
				});
			}

			return transact(ctx.db, async (db) => {
				const result = await repo.createMany(
					db,
					input.attachments.map((a) => ({
						expenseId: expense.id,
						key: a.key,
						size: a.size,
						originalName: a.originalName,
					})),
				);
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "expense",
					entityId: expense.id,
					action: "attachment.added",
					diff: null,
					payload: { count: input.attachments.length },
				});
				return result;
			});
		},

		async delete(
			ctx: AttachmentServiceContext,
			attachment: AttachmentDetail,
		): Promise<{ id: string }> {
			await deleteFilesFromStorage([attachment.key]);
			return transact(ctx.db, async (db) => {
				const result = await repo.remove(db, attachment.id);
				await audit.append(db, {
					organizationId: ctx.organizationId,
					actorId: ctx.userId,
					entityType: "attachment",
					entityId: attachment.id,
					action: "attachment.deleted",
					diff: {
						before: {
							originalName: attachment.originalName,
							size: Number(attachment.size),
						},
						after: null,
					},
					payload: null,
				});
				return result;
			});
		},

		async deletePendingUploads(
			ctx: AttachmentServiceContext,
			input: { keys: string[] },
		): Promise<{ deletedKeys: string[] }> {
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
		},
	};
}

export type AttachmentService = ReturnType<typeof createAttachmentService>;

export const attachmentService = createAttachmentService({
	repo: attachmentRepository,
	audit: auditRepository,
});
