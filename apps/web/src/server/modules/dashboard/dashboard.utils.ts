import type { Granularity, StatsDataPoint } from "./dashboard.dto";

function startOfDayUtc(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

function startOfIsoWeekUtc(date: Date): Date {
	const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
	const diffToMonday = day === 0 ? -6 : 1 - day;
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate() + diffToMonday,
		),
	);
}

function startOfMonthUtc(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfPeriod(date: Date, granularity: Granularity): Date {
	if (granularity === "day") return startOfDayUtc(date);
	if (granularity === "week") return startOfIsoWeekUtc(date);
	return startOfMonthUtc(date);
}

function addPeriod(date: Date, granularity: Granularity): Date {
	if (granularity === "day")
		return new Date(
			Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
		);
	if (granularity === "week")
		return new Date(
			Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 7),
		);
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function buildPeriodSeries(
	from: Date,
	to: Date,
	granularity: Granularity,
): Date[] {
	const periods: Date[] = [];
	let cursor = startOfPeriod(from, granularity);
	const end = startOfPeriod(to, granularity);

	while (cursor <= end) {
		periods.push(cursor);
		cursor = addPeriod(cursor, granularity);
	}

	return periods;
}

export function fillPeriodGaps(
	periods: Date[],
	rows: { periodStart: Date; amount: number }[],
): StatsDataPoint[] {
	const byPeriod = new Map(rows.map((r) => [r.periodStart.getTime(), r.amount]));
	return periods.map((periodStart) => ({
		periodStart,
		amount: byPeriod.get(periodStart.getTime()) ?? 0,
	}));
}
