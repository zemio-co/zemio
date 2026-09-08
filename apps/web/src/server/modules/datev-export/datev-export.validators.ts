import { z } from "zod";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * One end of the period: a calendar day, carried as its UTC midnight.
 *
 * Required to *be* a UTC midnight rather than merely documented as one. A
 * `Date` with a time of day is almost always a local midnight, and west of UTC
 * that names the previous day — which silently shifts the whole window: the
 * `paidAt` selection, the header's `Datum von`/`Datum bis`, and every `TTMM`
 * Belegdatum with it. Nothing downstream can tell such a value apart from a
 * deliberate one, so the one place that can is here, where it arrives.
 */
const calendarDayUtc = z
	.date()
	.refine((day) => day.getTime() % MILLISECONDS_PER_DAY === 0, {
		message:
			"must be a calendar day at UTC midnight, as Date.UTC(year, month, day)",
	});

/**
 * A DATEV export is addressed by the period it covers, not by a list of report
 * ids: the period plus "not exported yet" *is* the selection, which is what
 * makes the same export reproducible from two dates.
 *
 * Both ends are inclusive **calendar days read in UTC**, not instants. That is
 * the calendar the rest of the export uses — the header's `Datum von`/`Datum
 * bis` and every `TTMM` Belegdatum are written from `getUTC*`. A single-day
 * period is a legitimate one: `periodFrom === periodTo` selects exactly that
 * UTC day, since the query widens `periodTo` to the end of its day.
 *
 * No maximum length is imposed here: the preflight already refuses a period
 * that crosses a fiscal-year boundary, which bounds it at one year, and that
 * blocker names the reason where an anonymous length check could not.
 */
export const datevExportPeriodSchema = z
	.object({
		periodFrom: calendarDayUtc,
		periodTo: calendarDayUtc,
	})
	.refine((period) => period.periodFrom <= period.periodTo, {
		message: "periodFrom must not be after periodTo",
		path: ["periodFrom"],
	});

export type DatevExportPeriodInput = z.infer<typeof datevExportPeriodSchema>;
