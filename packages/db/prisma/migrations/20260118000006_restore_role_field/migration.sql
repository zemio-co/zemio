-- Restore role field required by better-auth admin plugin
-- Set default to "user" for existing and new records
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" TEXT;

-- Backfill any NULL roles to "user"
UPDATE "user" SET "role" = 'user' WHERE "role" IS NULL;

-- Enforce NOT NULL and default
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user';
