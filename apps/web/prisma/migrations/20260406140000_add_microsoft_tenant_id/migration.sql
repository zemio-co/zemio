-- AlterTable: add Microsoft Entra ID tenant ID to organization and user
ALTER TABLE "organization" ADD COLUMN "microsoftTenantId" TEXT;
ALTER TABLE "user" ADD COLUMN "microsoftTenantId" TEXT;
