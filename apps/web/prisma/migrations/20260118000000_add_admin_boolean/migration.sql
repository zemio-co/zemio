-- AlterTable: Replace role String? with admin Boolean @default(false)
-- First, drop the old role column
ALTER TABLE "user" DROP COLUMN IF EXISTS "role";

-- Add the new admin boolean column with default false
ALTER TABLE "user" ADD COLUMN "admin" BOOLEAN NOT NULL DEFAULT false;

-- If you had users with role = 'admin', you can migrate them:
-- UPDATE "user" SET admin = true WHERE role = 'admin';
