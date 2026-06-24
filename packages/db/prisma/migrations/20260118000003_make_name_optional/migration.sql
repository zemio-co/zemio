-- Make name field optional in user table
-- Microsoft OAuth might not always provide a name, so we make it optional
ALTER TABLE "user" ALTER COLUMN "name" DROP NOT NULL;
