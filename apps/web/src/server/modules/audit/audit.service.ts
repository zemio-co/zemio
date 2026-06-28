import type { PrismaClient } from "@zemio/db";
import { type AuditEventDTO, toAuditEventDTO } from "./audit.dto";
import { type AuditRepository, auditRepository } from "./audit.repository";

export type AuditServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
};

type ListInput = { cursor?: string; limit: number };

type ListResult = {
	items: AuditEventDTO[];
	nextCursor: string | null;
};

export function createAuditService(deps: { repo: AuditRepository }) {
	const { repo } = deps;

	return {
		async list(
			ctx: AuditServiceContext,
			reportId: string,
			input: ListInput,
		): Promise<ListResult> {
			const entityIds = await repo.findReportEntityIds(ctx.db, {
				reportId,
				organizationId: ctx.organizationId,
			});
			const result = await repo.listPage(ctx.db, {
				where: { organizationId: ctx.organizationId, entityId: { in: entityIds } },
				cursor: input.cursor,
				take: input.limit,
			});
			return {
				items: result.items.map(toAuditEventDTO),
				nextCursor: result.nextCursor,
			};
		},

		async history(
			ctx: AuditServiceContext,
			reportId: string,
			input: ListInput,
		): Promise<ListResult> {
			const result = await repo.listPage(ctx.db, {
				where: {
					organizationId: ctx.organizationId,
					entityType: "report",
					entityId: reportId,
				},
				cursor: input.cursor,
				take: input.limit,
			});
			return {
				items: result.items.map(toAuditEventDTO),
				nextCursor: result.nextCursor,
			};
		},

		async addComment(
			ctx: AuditServiceContext,
			reportId: string,
			text: string,
		): Promise<void> {
			await repo.append(ctx.db, {
				organizationId: ctx.organizationId,
				actorId: ctx.userId,
				entityType: "report",
				entityId: reportId,
				action: "report.comment_added",
				diff: null,
				payload: { text },
			});
		},
	};
}

export type AuditService = ReturnType<typeof createAuditService>;

export const auditService = createAuditService({ repo: auditRepository });
