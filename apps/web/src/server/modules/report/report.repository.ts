import type { Prisma, PrismaClient, ReportStatus } from "@zemio/db";
import {
	foodDetailSelect,
	travelDetailSelect,
} from "@/server/modules/expense/expense.repository";

type Db = PrismaClient;

/** Full set of `Report` scalar fields — keeps list/detail rows assignable to the model type. */
const reportScalarSelect = {
	id: true,
	tag: true,
	title: true,
	description: true,
	status: true,
	paidAt: true,
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
	costUnit: { select: { tag: true, title: true } },
} satisfies Prisma.ReportSelect;

const reportListRowSelect = {
	...reportScalarSelect,
	owner: { select: { name: true, image: true, email: true } },
	costUnit: { select: { tag: true, color: true, title: true } },
} satisfies Prisma.ReportSelect;

const reviewDetailSelect = {
	id: true,
	tag: true,
	title: true,
	description: true,
	status: true,
	paidAt: true,
	createdAt: true,
	lastUpdatedAt: true,
	owner: { select: { id: true, name: true, email: true, image: true } },
	bankingDetails: { select: { iban: true, fullName: true } },
	bankingSnapshot: { select: { iban: true, fullName: true } },
	costUnit: { select: { color: true, title: true, tag: true } },
	expenses: {
		select: {
			id: true,
			description: true,
			amount: true,
			startDate: true,
			endDate: true,
			type: true,
			inputTaxRate: true,
			meta: true,
			travelDetail: travelDetailSelect,
			foodDetail: foodDetailSelect,
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

/**
 * Issues the next report number for an organization and returns it.
 *
 * Raw SQL because the healing `GREATEST` cannot be expressed through Prisma's
 * fluent API. Correctness rests on `reportCounter` alone: `SET x = GREATEST(x,
 * …) + 1` re-reads the committed row after waiting for the lock, exactly like a
 * plain `x + 1`, so two concurrent creates can never receive the same number.
 *
 * The `MAX(tag)` floor only raises a counter that has fallen *behind* the rows.
 * A database whose schema was applied with `prisma db push` never runs the
 * migration's seeding step, so its counter sits at 0 while reports already
 * carry tags 1..N; without the healing term the first create would collide on
 * `report_organizationId_tag_key`, and because that rolls the increment back
 * with the transaction, every later create would collide identically and report
 * creation would stay broken. A stale `MAX` can only fail to heal, never issue
 * a duplicate.
 */
async function issueReportTag(db: Db, organizationId: string): Promise<number> {
	const rows = await db.$queryRaw<Array<{ reportCounter: number }>>`
		UPDATE "organization" o
		SET "reportCounter" = GREATEST(
			o."reportCounter",
			COALESCE(
				(SELECT MAX(r."tag") FROM "report" r WHERE r."organizationId" = o."id"),
				0
			)
		) + 1
		WHERE o."id" = ${organizationId}
		RETURNING o."reportCounter"
	`;

	const issued = rows[0]?.reportCounter;
	if (issued === undefined) {
		// Unreachable in practice — the organization comes from the session — but
		// without this the missing row would surface as a null-tag insert.
		throw new Error(`Organization ${organizationId} not found`);
	}
	return issued;
}

export const reportRepository = {
	findById(db: Db, args: { id: string; organizationId: string }) {
		return db.report.findFirst({
			where: { id: args.id, organizationId: args.organizationId },
			select: reportDetailSelect,
		});
	},

	listPage(db: Db, args: ListPageArgs): Promise<ReportListRow[]> {
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
					bankingSnapshot: { select: { iban: true, fullName: true } },
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

	/**
	 * Copies the encrypted values of the given banking details into the
	 * report's snapshot (creating or refreshing it). Returns false when the
	 * banking details no longer exist.
	 */
	async snapshotBankingDetails(
		db: Db,
		args: { reportId: string; bankingDetailsId: string },
	): Promise<boolean> {
		const details = await db.bankingDetails.findUnique({
			where: { id: args.bankingDetailsId },
			select: { iban: true, fullName: true },
		});
		if (!details) {
			return false;
		}
		await db.reportBankingSnapshot.upsert({
			where: { reportId: args.reportId },
			create: { reportId: args.reportId, ...details },
			update: details,
		});
		return true;
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

	/**
	 * Issues the report's per-organization `tag` and creates the row.
	 * The counter update is a single atomic statement, so the organization row
	 * stays locked until the caller's transaction commits — concurrent creates
	 * within one organization serialize, and other organizations never contend.
	 * Must run inside a transaction so a failed create cannot burn a number.
	 */
	async create(db: Db, data: Omit<Prisma.ReportUncheckedCreateInput, "tag">) {
		const tag = await issueReportTag(db, data.organizationId);
		return db.report.create({
			data: { ...data, tag },
			select: { id: true },
		});
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

	setStatus(db: Db, args: { id: string; status: ReportStatus; paidAt?: Date }) {
		return db.report.update({
			where: { id: args.id },
			data: { status: args.status, paidAt: args.paidAt },
			select: { id: true, status: true },
		});
	},

	remove(db: Db, id: string) {
		return db.report.delete({ where: { id }, select: { id: true } });
	},
} as const;

export type ReportRepository = typeof reportRepository;
