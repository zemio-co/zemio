import type { Prisma, PrismaClient, ReportStatus } from "@zemio/db";

type Db = PrismaClient;

/** Full set of `Report` scalar fields — keeps list/detail rows assignable to the model type. */
const reportScalarSelect = {
	id: true,
	tag: true,
	title: true,
	description: true,
	status: true,
	organizationId: true,
	costUnitId: true,
	ownerId: true,
	bankingDetailsId: true,
	createdAt: true,
	lastUpdatedAt: true,
} satisfies Prisma.ReportSelect;

const reportDetailSelect = {
	...reportScalarSelect,
	owner: {
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			preferences: { select: { notifications: true } },
		},
	},
} satisfies Prisma.ReportSelect;

const reportListRowSelect = {
	...reportScalarSelect,
	owner: { select: { name: true, image: true, email: true } },
	costUnit: { select: { tag: true } },
} satisfies Prisma.ReportSelect;

const reviewDetailSelect = {
	id: true,
	tag: true,
	title: true,
	description: true,
	status: true,
	createdAt: true,
	owner: { select: { id: true, name: true, email: true, image: true } },
	bankingDetails: { select: { iban: true, fullName: true } },
	expenses: {
		select: {
			id: true,
			description: true,
			amount: true,
			startDate: true,
			endDate: true,
			type: true,
			meta: true,
			reportId: true,
			attachments: {
				select: {
					id: true,
					size: true,
					originalName: true,
					createdAt: true,
					updatedAt: true,
					expenseId: true,
				},
			},
		},
	},
} satisfies Prisma.ReportSelect;

export type ReportDetail = Prisma.ReportGetPayload<{
	select: typeof reportDetailSelect;
}>;
export type ReportListRow = Prisma.ReportGetPayload<{
	select: typeof reportListRowSelect;
}>;
export type ReviewDetail = Prisma.ReportGetPayload<{
	select: typeof reviewDetailSelect;
}>;

type ListPageArgs = {
	where: Prisma.ReportWhereInput;
	orderBy: Prisma.ReportOrderByWithRelationInput;
	take: number;
	skip: number;
};

type ReviewListArgs = {
	where: Prisma.ReportWhereInput;
	limit: number;
	cursor: string | null | undefined;
};

export const reportRepository = {
	findById(db: Db, args: { id: string; organizationId: string }) {
		return db.report.findFirst({
			where: { id: args.id, organizationId: args.organizationId },
			select: reportDetailSelect,
		});
	},

	listOwned(db: Db, args: ListPageArgs): Promise<ReportListRow[]> {
		return db.report.findMany({
			where: args.where,
			orderBy: args.orderBy,
			take: args.take,
			skip: args.skip,
			select: reportListRowSelect,
		});
	},

	count(db: Db, where: Prisma.ReportWhereInput): Promise<number> {
		return db.report.count({ where });
	},

	sumByReportIds(db: Db, reportIds: string[]) {
		if (reportIds.length === 0) {
			return Promise.resolve(
				[] as Array<{ reportId: string; _sum: { amount: Prisma.Decimal | null } }>,
			);
		}
		return db.expense.groupBy({
			by: ["reportId"],
			where: { reportId: { in: reportIds } },
			_sum: { amount: true },
		});
	},

	async reviewListPage(
		db: Db,
		args: ReviewListArgs,
	): Promise<{ rows: ReportListRow[]; totalCount: number }> {
		const [rows, totalCount] = await db.$transaction([
			db.report.findMany({
				take: args.limit + 1,
				cursor: args.cursor ? { id: args.cursor } : undefined,
				where: args.where,
				// `id` is a deterministic tiebreaker so cursor pagination cannot skip
				// or duplicate rows that share a `lastUpdatedAt` timestamp.
				orderBy: [{ lastUpdatedAt: "desc" }, { id: "desc" }],
				select: reportListRowSelect,
			}),
			db.report.count({ where: args.where }),
		]);

		return { rows, totalCount };
	},

	reviewDetail(
		db: Db,
		args: { id: string; organizationId: string },
	): Promise<ReviewDetail | null> {
		return db.report.findFirst({
			where: { id: args.id, organizationId: args.organizationId },
			select: reviewDetailSelect,
		});
	},

	async financialSummary(db: Db, args: { id: string; organizationId: string }) {
		// Single round trip: the authorization subject (ownerId/status), the
		// banking details, and the expense total. Replaces the old existence
		// check + separate loader query.
		const [report, totals] = await db.$transaction([
			db.report.findFirst({
				where: { id: args.id, organizationId: args.organizationId },
				select: {
					ownerId: true,
					status: true,
					bankingDetails: { select: { iban: true, fullName: true } },
				},
			}),
			db.expense.aggregate({
				where: {
					reportId: args.id,
					report: { organizationId: args.organizationId },
				},
				_sum: { amount: true },
			}),
		]);

		return { report, totalAmount: totals._sum.amount };
	},

	findBankingDetailsOwner(db: Db, bankingDetailsId: string) {
		return db.bankingDetails.findUnique({
			where: { id: bankingDetailsId },
			select: { userId: true },
		});
	},

	findCostUnit(db: Db, args: { id: string; organizationId: string }) {
		return db.costUnit.findFirst({
			where: { id: args.id, organizationId: args.organizationId },
			select: { id: true },
		});
	},

	findReviewerEmail(db: Db, organizationId: string) {
		return db.settings.findUnique({
			where: { organizationId },
			select: { reviewerEmail: true },
		});
	},

	create(db: Db, data: Prisma.ReportUncheckedCreateInput) {
		return db.report.create({ data, select: { id: true } });
	},

	update(
		db: Db,
		args: { id: string; data: { title?: string; description?: string } },
	) {
		return db.report.update({
			where: { id: args.id },
			data: args.data,
			select: { id: true },
		});
	},

	setStatus(db: Db, args: { id: string; status: ReportStatus }) {
		return db.report.update({
			where: { id: args.id },
			data: { status: args.status },
			select: { id: true, status: true },
		});
	},

	remove(db: Db, id: string) {
		return db.report.delete({ where: { id }, select: { id: true } });
	},
} as const;

export type ReportRepository = typeof reportRepository;
