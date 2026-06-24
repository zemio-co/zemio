-- Make admin field optional (nullable) to allow better-auth to create users without setting this field
-- The default value will be set via application logic or manually in Prisma Studio
ALTER TABLE "user" ALTER COLUMN "admin" DROP NOT NULL;
