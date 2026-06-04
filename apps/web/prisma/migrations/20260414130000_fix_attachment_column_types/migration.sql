-- Drop temporary defaults that were added solely to satisfy NOT NULL during backfill
ALTER TABLE "attachment" ALTER COLUMN "size" DROP DEFAULT;
ALTER TABLE "attachment" ALTER COLUMN "originalName" DROP DEFAULT;

-- Upgrade size to BIGINT — byte counts are semantically 64-bit values
ALTER TABLE "attachment" ALTER COLUMN "size" TYPE BIGINT;
