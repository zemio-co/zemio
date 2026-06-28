import { Prisma, type PrismaClient } from "@zemio/db";
import type { NewAuditAction } from "./audit.validators";

type Db = PrismaClient;

const auditEventSelect = {
	id: true,
	organizationId: true,
	actorId: true,
	actor: { select: { id: true, name: true, image: true } },
	entityType: true,
	entityId: true,
	action: true,
	diff: true,
	payload: true,
	createdAt: true,
} satisfies Prisma.AuditEventSelect;

export type AuditEventRow = Prisma.AuditEventGetPayload<{
	select: typeof auditEventSelect;
}>;

export type NewAuditEntry = {
	organizationId: string;
	actorId: string;
	entityId: string;
} & NewAuditAction;

type ListPageArgs = {
	where: Prisma.AuditEventWhereInput;
	cursor?: string;
	take: number;
};

type ListPageResult = {
	items: AuditEventRow[];
	nextCursor: string | null;
};

export const auditRepository = {
	async append(db: Db, entry: NewAuditEntry): Promise<void> {
		await db.auditEvent.create({
			data: {
				organizationId: entry.organizationId,
				actorId: entry.actorId,
				entityType: entry.entityType,
				entityId: entry.entityId,
				action: entry.action,
				diff:
					entry.diff !== null
						? (entry.diff as unknown as Prisma.InputJsonValue)
						: Prisma.DbNull,
				payload:
					entry.payload !== null
						? (entry.payload as unknown as Prisma.InputJsonValue)
						: Prisma.DbNull,
			},
			select: { id: true },
		});
	},

	async listPage(db: Db, args: ListPageArgs): Promise<ListPageResult> {
		const rows = await db.auditEvent.findMany({
			where: args.where,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: args.take + 1,
			cursor: args.cursor ? { id: args.cursor } : undefined,
			skip: args.cursor ? 1 : 0,
			select: auditEventSelect,
		});

		const hasNextPage = rows.length > args.take;
		const items = hasNextPage ? rows.slice(0, args.take) : rows;
		const nextCursor = hasNextPage ? (items.at(-1)?.id ?? null) : null;

		return { items, nextCursor };
	},

	findReportEntityIds(
		db: Db,
		args: { reportId: string; organizationId: string },
	): Promise<string[]> {
		return db.expense
			.findMany({
				where: {
					reportId: args.reportId,
					report: { organizationId: args.organizationId },
				},
				select: { id: true, attachments: { select: { id: true } } },
			})
			.then((expenses) => [
				args.reportId,
				...expenses.map((e) => e.id),
				...expenses.flatMap((e) => e.attachments.map((a) => a.id)),
			]);
	},
} as const;

export type AuditRepository = typeof auditRepository;
