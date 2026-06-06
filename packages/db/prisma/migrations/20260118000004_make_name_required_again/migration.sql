-- Make name field required again
-- Better-auth requires name to be a non-null string
-- We provide fallback in mapProfileToUser, so it should never be null
-- First, set a default value for any NULL names (use email prefix as fallback)
UPDATE "user" SET "name" = SPLIT_PART("email", '@', 1) WHERE "name" IS NULL;
-- Then make it NOT NULL
ALTER TABLE "user" ALTER COLUMN "name" SET NOT NULL;
