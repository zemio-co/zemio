/*
  Migration: Add bankingDetailsId to Report

  This migration adds the required bankingDetailsId column to the Report table.
  It uses a safe multi-step approach to handle existing data:
  1. Add the column as nullable
  2. Delete orphaned reports (those without a linked banking detail from the same owner)
  3. Alter the column to NOT NULL
*/

-- Step 1: Add the column as nullable first
ALTER TABLE "Report" ADD COLUMN "bankingDetailsId" TEXT;

-- Step 2: Delete existing reports that cannot be linked to banking details
-- This removes any reports where the owner has no banking details to link to
DELETE FROM "Report"
WHERE "bankingDetailsId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "banking_details" bd
    WHERE bd."userId" = "Report"."ownerId"
  );

-- Step 3: Link remaining reports to their owner's first banking detail
UPDATE "Report"
SET "bankingDetailsId" = (
  SELECT bd."id" FROM "banking_details" bd
  WHERE bd."userId" = "Report"."ownerId"
  ORDER BY bd."createdAt" ASC
  LIMIT 1
)
WHERE "bankingDetailsId" IS NULL;

-- Step 4: Now that all rows have a value, alter the column to NOT NULL
ALTER TABLE "Report" ALTER COLUMN "bankingDetailsId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_bankingDetailsId_fkey" FOREIGN KEY ("bankingDetailsId") REFERENCES "banking_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
