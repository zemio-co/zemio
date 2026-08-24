-- Onboarding: joining rules, remembered active organization, and the
-- grandfathering that ADR-0008 depends on.
--
-- Behaviour-preserving for existing deployments. Every organization that had a
-- Microsoft tenant configured gets an equivalent AUTO_JOIN rule before the
-- column is dropped, so people keep joining exactly the organizations they
-- joined yesterday.

-- CreateEnum
CREATE TYPE "JoiningRuleType" AS ENUM ('MS_TENANT', 'EMAIL_DOMAIN', 'SSO_CONNECTION');

-- CreateEnum
CREATE TYPE "JoiningRuleMode" AS ENUM ('AUTO_JOIN', 'REQUEST');

-- CreateTable
CREATE TABLE "joining_rule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "JoiningRuleType" NOT NULL,
    "value" TEXT NOT NULL,
    "mode" "JoiningRuleMode" NOT NULL DEFAULT 'AUTO_JOIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "joining_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "joining_rule_organizationId_type_value_key" ON "joining_rule"("organizationId", "type", "value");

-- CreateIndex
CREATE INDEX "joining_rule_type_value_idx" ON "joining_rule"("type", "value");

-- AddForeignKey
ALTER TABLE "joining_rule" ADD CONSTRAINT "joining_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry every configured tenant across as an AUTO_JOIN rule. This is what
-- makes the change invisible to existing organizations: the session hook
-- resolves the same tenants afterwards, just from a different table.
INSERT INTO "joining_rule" ("id", "organizationId", "type", "value", "mode", "createdAt")
SELECT gen_random_uuid()::text, "id", 'MS_TENANT', lower("microsoftTenantId"), 'AUTO_JOIN', CURRENT_TIMESTAMP
FROM "organization"
WHERE "microsoftTenantId" IS NOT NULL AND "microsoftTenantId" <> '';

-- DropColumn
ALTER TABLE "organization" DROP COLUMN "microsoftTenantId";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "lastActiveOrganizationId" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_lastActiveOrganizationId_fkey" FOREIGN KEY ("lastActiveOrganizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Grandfather everyone who is already a member of an organization (ADR-0008).
-- They are inside by an administrator's or a tenant's decision; demanding
-- retroactive proof of an address would lock working users out of their next
-- invitation while protecting nothing.
UPDATE "user"
SET "emailVerified" = true
WHERE "emailVerified" = false
  AND EXISTS (SELECT 1 FROM "member" WHERE "member"."userId" = "user"."id");
