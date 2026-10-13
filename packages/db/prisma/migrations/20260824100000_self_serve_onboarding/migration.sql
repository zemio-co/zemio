-- Onboarding: joining rules, remembered active organization, and a reset of
-- every address to unverified, since none was verified by Zemio (ADR-0008).
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

-- Values are compared as stored, and lookups lowercase what they look for. An
-- uppercase value would be a rule nothing matches, so it is refused here
-- rather than trusted to every writer.
ALTER TABLE "joining_rule" ADD CONSTRAINT "joining_rule_value_lowercase" CHECK ("value" = lower("value"));

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

-- CreateIndex
CREATE INDEX "user_lastActiveOrganizationId_idx" ON "user"("lastActiveOrganizationId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_lastActiveOrganizationId_fkey" FOREIGN KEY ("lastActiveOrganizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Nothing before this release verified an address. Microsoft was the only way
-- in, and Better Auth set `emailVerified` from the provider's own claims, so
-- every `true` here is an assertion, which proves nothing (ADR-0008). Kept, it
-- would grant invitations, email-domain joining and account linking on an
-- address a tenant administrator could have set, and would let a squatted
-- address past the magic-link refusal, which only looks at unverified users.
--
-- Reset rather than grandfathered. Membership is unaffected and onboarding is
-- stamped complete for everybody, so nobody is stopped from working: a work
-- account on a proved domain is verified again at its next sign-in
-- (ADR-0010), and anybody else confirms by mail the first time an address
-- would grant them something.
UPDATE "user" SET "emailVerified" = false WHERE "emailVerified" = true;
