-- Expense dates become calendar days.
--
-- These columns always held a day, never an instant, but they held it as a
-- `timestamp` written from `parse(value, "dd.MM.yyyy", new Date())` — local
-- midnight. On a server east of UTC the 1st of March was therefore stored as
-- `2026-02-28 23:00:00`, and whether it read back as the 28th or the 1st then
-- depended on which getter the reader used: the DATEV export reads with
-- getUTC*, the PDF formats locally, and the two disagreed by a day.
--
-- Prisma's own DDL for this change is a bare `SET DATA TYPE DATE`, which takes
-- the date part as stored and would make that off-by-one permanent. The `USING`
-- below rounds to the nearest midnight instead, so a row recovers the day it
-- was meant to carry whatever timezone wrote it:
--
--     2026-03-01 00:00:00  (UTC)        -> 2026-03-01
--     2026-02-28 23:00:00  (CET,  +1)   -> 2026-03-01
--     2026-02-28 22:00:00  (CEST, +2)   -> 2026-03-01
--
-- Correct for any offset strictly inside ±12 hours, which covers every zone
-- this application has run in. Going the other way is lossy by design: a date
-- column has no time to put back.
ALTER TABLE "expense"
  ALTER COLUMN "startDate" TYPE DATE USING ("startDate" + INTERVAL '12 hours')::DATE,
  ALTER COLUMN "endDate"   TYPE DATE USING ("endDate"   + INTERVAL '12 hours')::DATE;
