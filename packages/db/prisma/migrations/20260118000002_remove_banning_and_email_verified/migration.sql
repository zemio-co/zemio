-- Remove banning fields from user table
-- Note: emailVerified is kept as BOOLEAN (not nullable) for better-auth compatibility
-- Better-auth requires emailVerified as boolean with default false
ALTER TABLE "user" DROP COLUMN IF EXISTS "banned";
ALTER TABLE "user" DROP COLUMN IF EXISTS "banReason";
ALTER TABLE "user" DROP COLUMN IF EXISTS "banExpires";

-- Ensure emailVerified exists as BOOLEAN NOT NULL DEFAULT false
-- Better-auth expects emailVerified to be boolean, not DateTime
DO $$
BEGIN
  -- Check if emailVerified column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'emailVerified'
  ) THEN
    -- Check if it's TIMESTAMP (wrong type)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user' AND column_name = 'emailVerified' AND data_type = 'timestamp without time zone'
    ) THEN
      -- Drop the timestamp column
      ALTER TABLE "user" DROP COLUMN "emailVerified";
      -- Add it back as BOOLEAN
      ALTER TABLE "user" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user' AND column_name = 'emailVerified' AND data_type = 'boolean'
    ) THEN
      -- Already boolean, just ensure it's NOT NULL with default
      ALTER TABLE "user" ALTER COLUMN "emailVerified" SET NOT NULL;
      ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DEFAULT false;
    END IF;
  ELSE
    -- Column doesn't exist, add it as BOOLEAN
    ALTER TABLE "user" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
