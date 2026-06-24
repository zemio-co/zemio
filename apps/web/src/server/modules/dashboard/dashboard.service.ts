import type { PrismaClient } from "@zemio/db";
import type {
	GetStatInput,
	ReportCountResult,
	StatSeries,
} from "./dashboard.dto";
import {
	type DashboardRepository,
	dashboardRepository,
} from "./dashboard.repository";
import {
	buildPeriodSeries,
	fillPeriodGaps,
	startOfPeriod,
} from "./dashboard.utils";

export type DashboardServiceContext = {
	db: PrismaClient;
	organizationId: string;
	userId: string;
};

function buildQueryArgs(
	ctx: DashboardServiceContext,
	input: GetStatInput,
	from: Date,
) {
	return {
		organizationId: ctx.organizationId,
		userId: ctx.userId,
		from,
		to: input.endDate,
		granularity: input.granularity,
	};
}

export function createDashboardService(deps: { repo: DashboardRepository }) {
	const { repo } = deps;

	return {
		async submittedStats(
			ctx: DashboardServiceContext,
			input: GetStatInput,
		): Promise<StatSeries> {
			const from = startOfPeriod(input.startDate, input.granularity);
			const periods = buildPeriodSeries(from, input.endDate, input.granularity);
			const args = buildQueryArgs(ctx, input, from);

			const [rows, total] = await Promise.all([
				repo.submittedSeries(ctx.db, args),
				repo.submittedTotal(ctx.db, args),
			]);

			return { series: fillPeriodGaps(periods, rows), total };
		},

		async reimbursedStats(
			ctx: DashboardServiceContext,
			input: GetStatInput,
		): Promise<StatSeries> {
			const from = startOfPeriod(input.startDate, input.granularity);
			const periods = buildPeriodSeries(from, input.endDate, input.granularity);
			const args = buildQueryArgs(ctx, input, from);

			const [rows, total] = await Promise.all([
				repo.reimbursedSeries(ctx.db, args),
				repo.reimbursedTotal(ctx.db, args),
			]);

			return { series: fillPeriodGaps(periods, rows), total };
		},

		async createdCount(ctx: DashboardServiceContext): Promise<ReportCountResult> {
			const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
			const count = await repo.createdCount(ctx.db, {
				organizationId: ctx.organizationId,
				userId: ctx.userId,
				from,
			});
			return { count };
		},

		async acceptedCount(
			ctx: DashboardServiceContext,
		): Promise<ReportCountResult> {
			const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
			const count = await repo.acceptedCount(ctx.db, {
				organizationId: ctx.organizationId,
				userId: ctx.userId,
				from,
			});
			return { count };
		},
	};
}

export type DashboardService = ReturnType<typeof createDashboardService>;

export const dashboardService = createDashboardService({
	repo: dashboardRepository,
});
