import {
	addMonths,
	addYears,
	startOfMonth,
	startOfYear,
	subMonths,
	subYears,
} from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { ReportStatus } from "@/generated/prisma/enums";
import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";

type PeriodRange = {
	start: Date;
	end: Date;
};

type PeriodComparison = {
	current: PeriodRange;
	previous: PeriodRange;
};

type AmountAggregateResult = {
	_sum: {
		amount: Prisma.Decimal | null;
	};
};

type DashboardStatsMetric = {
	amount: number;
	changePercent: number | null;
	comparisonPeriodStart: Date;
	periodStart: Date;
};

function getMonthComparison(now: Date): PeriodComparison {
	const currentStart = startOfMonth(now);
	const previousStart = subMonths(currentStart, 1);

	return {
		current: {
			start: currentStart,
			end: addMonths(currentStart, 1),
		},
		previous: {
			start: previousStart,
			end: currentStart,
		},
	};
}

function getYearComparison(now: Date): PeriodComparison {
	const currentStart = startOfYear(now);
	const previousStart = subYears(currentStart, 1);

	return {
		current: {
			start: currentStart,
			end: addYears(currentStart, 1),
		},
		previous: {
			start: previousStart,
			end: currentStart,
		},
	};
}

function amountFromAggregate(result: AmountAggregateResult): number {
	return result._sum.amount ? Number(result._sum.amount) : 0;
}

function calculateChangePercent(
	currentAmount: number,
	previousAmount: number,
): number | null {
	if (previousAmount === 0) {
		return null;
	}

	return Math.round(((currentAmount - previousAmount) / previousAmount) * 100);
}

function buildMetric(
	currentAggregate: AmountAggregateResult,
	previousAggregate: AmountAggregateResult,
	currentPeriodStart: Date,
	previousPeriodStart: Date,
): DashboardStatsMetric {
	const currentAmount = amountFromAggregate(currentAggregate);
	const previousAmount = amountFromAggregate(previousAggregate);

	return {
		amount: currentAmount,
		changePercent: calculateChangePercent(currentAmount, previousAmount),
		comparisonPeriodStart: previousPeriodStart,
		periodStart: currentPeriodStart,
	};
}

export const dashboardRouter = createTRPCRouter({
	getStats: orgProcedure.query(async ({ ctx }) => {
		const now = new Date();
		const monthComparison = getMonthComparison(now);
		const yearComparison = getYearComparison(now);
		const ownerReportFilter = {
			organizationId: ctx.organizationId,
			ownerId: ctx.session.user.id,
		};

		const [
			currentMonthExpenses,
			previousMonthExpenses,
			currentYearReimbursed,
			previousYearReimbursed,
		] = await ctx.db.$transaction([
			ctx.db.expense.aggregate({
				where: {
					report: {
						...ownerReportFilter,
						createdAt: {
							gte: monthComparison.current.start,
							lt: monthComparison.current.end,
						},
					},
				},
				_sum: {
					amount: true,
				},
			}),
			ctx.db.expense.aggregate({
				where: {
					report: {
						...ownerReportFilter,
						createdAt: {
							gte: monthComparison.previous.start,
							lt: monthComparison.previous.end,
						},
					},
				},
				_sum: {
					amount: true,
				},
			}),
			ctx.db.expense.aggregate({
				where: {
					report: {
						...ownerReportFilter,
						createdAt: {
							gte: yearComparison.current.start,
							lt: yearComparison.current.end,
						},
						status: ReportStatus.ACCEPTED,
					},
				},
				_sum: {
					amount: true,
				},
			}),
			ctx.db.expense.aggregate({
				where: {
					report: {
						...ownerReportFilter,
						createdAt: {
							gte: yearComparison.previous.start,
							lt: yearComparison.previous.end,
						},
						status: ReportStatus.ACCEPTED,
					},
				},
				_sum: {
					amount: true,
				},
			}),
		]);

		return {
			monthlyExpenses: buildMetric(
				currentMonthExpenses,
				previousMonthExpenses,
				monthComparison.current.start,
				monthComparison.previous.start,
			),
			yearlyReimbursed: buildMetric(
				currentYearReimbursed,
				previousYearReimbursed,
				yearComparison.current.start,
				yearComparison.previous.start,
			),
		};
	}),
});
