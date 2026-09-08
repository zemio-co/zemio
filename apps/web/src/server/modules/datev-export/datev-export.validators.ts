import { z } from "zod";

/**
 * A DATEV export is addressed by the period it covers, not by a list of report
 * ids: the period plus "not exported yet" *is* the selection, which is what
 * makes the same export reproducible from two dates.
 *
 * Both ends are inclusive **calendar days read in UTC**, not instants. That is
 * the calendar the rest of the export uses — the header's `Datum von`/`Datum
 * bis` and every `TTMM` Belegdatum are written from `getUTC*` — so a caller
 * must send UTC midnights (`Date.UTC(y, m, d)`), never a local midnight. A
 * picker in Berlin that hands over its own midnight sends the previous UTC day
 * and shifts the whole window by one; the time of day is otherwise ignored,
 * since the query widens `periodTo` to the end of its UTC day.
 *
 * No maximum length is imposed here: the preflight already refuses a period
 * that crosses a fiscal-year boundary, which bounds it at one year, and that
 * blocker names the reason where an anonymous length check could not.
 */
export const datevExportPeriodSchema = z
	.object({
		periodFrom: z.date(),
		periodTo: z.date(),
	})
	.refine((period) => period.periodFrom <= period.periodTo, {
		message: "periodFrom must not be after periodTo",
		path: ["periodFrom"],
	});

export type DatevExportPeriodInput = z.infer<typeof datevExportPeriodSchema>;
