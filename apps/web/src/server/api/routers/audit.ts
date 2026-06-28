import type { PrismaClient } from "@zemio/db";
import { z } from "zod";
import { createTRPCRouter } from "@/server/api/trpc";
import { type AuditServiceContext, auditService } from "@/server/modules/audit";
import { reportProcedure } from "@/server/modules/report";

type AuditRequestContext = {
	db: PrismaClient;
	organizationId: string;
	session: { user: { id: string } };
};

function toAuditServiceContext(ctx: AuditRequestContext): AuditServiceContext {
	return {
		db: ctx.db,
		organizationId: ctx.organizationId,
		userId: ctx.session.user.id,
	};
}

const listInput = z.object({
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(50).default(20),
});

export const auditRouter = createTRPCRouter({
	list: reportProcedure("read")
		.input(listInput)
		.query(({ ctx, input }) =>
			auditService.list(toAuditServiceContext(ctx), ctx.report.id, input),
		),

	history: reportProcedure("read")
		.input(listInput)
		.query(({ ctx, input }) =>
			auditService.history(toAuditServiceContext(ctx), ctx.report.id, input),
		),

	addComment: reportProcedure("read")
		.input(z.object({ text: z.string().min(1).max(2000) }))
		.mutation(({ ctx, input }) =>
			auditService.addComment(
				toAuditServiceContext(ctx),
				ctx.report.id,
				input.text,
			),
		),
});
