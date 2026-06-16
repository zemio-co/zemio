import type { Prisma, PrismaClient } from "@zemio/db";

type Db = PrismaClient;

const expenseDetailSelect = {
	id: true,
	reportId: true,
	type: true,
	amount: true,
	description: true,
	startDate: true,
	endDate: true,
	meta: true,
	report: {
		select: {
			ownerId: true,
			organizationId: true,
			status: true,
		},
	},
} satisfies Prisma.ExpenseSelect;

const expenseListItemSelect = {
	id: true,
	reportId: true,
	type: true,
	amount: true,
	description: true,
	startDate: true,
	endDate: true,
	meta: true,
	attachments: {
		select: {
			id: true,
			key: true,
			size: true,
			originalName: true,
			expenseId: true,
			createdAt: true,
			updatedAt: true,
		},
	},
} satisfies Prisma.ExpenseSelect;

export type ExpenseDetail = Prisma.ExpenseGetPayload<{
	select: typeof expenseDetailSelect;
}>;

export type ExpenseListItem = Prisma.ExpenseGetPayload<{
	select: typeof expenseListItemSelect;
}>;

export const expenseRepository = {
	findById(db: Db, id: string): Promise<ExpenseDetail | null> {
		return db.expense.findUnique({
			where: { id },
			select: expenseDetailSelect,
		});
	},

	listForReport(db: Db, reportId: string): Promise<ExpenseListItem[]> {
		return db.expense.findMany({
			where: { reportId },
			select: expenseListItemSelect,
		});
	},

	findReport(db: Db, args: { id: string; organizationId: string }) {
		return db.report.findFirst({
			where: { id: args.id, organizationId: args.organizationId },
			select: { ownerId: true, status: true },
		});
	},

	findSettings(db: Db, organizationId: string) {
		return db.settings.findUnique({
			where: { organizationId },
			select: { kilometerRate: true },
		});
	},

	create(db: Db, data: Prisma.ExpenseCreateInput): Promise<{ id: string }> {
		return db.expense.create({ data, select: { id: true } });
	},

	update(
		db: Db,
		args: { id: string; data: Prisma.ExpenseUpdateInput },
	): Promise<{ id: string }> {
		return db.expense.update({
			where: { id: args.id },
			data: args.data,
			select: { id: true },
		});
	},

	async findAttachmentKeys(db: Db, expenseId: string): Promise<string[]> {
		const attachments = await db.attachment.findMany({
			where: { expenseId },
			select: { key: true },
		});
		return attachments.map((a) => a.key);
	},

	remove(db: Db, id: string): Promise<{ id: string }> {
		return db.expense.delete({ where: { id }, select: { id: true } });
	},
} as const;

export type ExpenseRepository = typeof expenseRepository;
