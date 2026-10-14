-- One trial per person, ever (ADR-0009).
--
-- Claimed with a conditional update before a trial is started, which is what
-- stops two organizations created in the same moment from both getting one.

-- AlterTable
ALTER TABLE "user" ADD COLUMN "trialClaimedAt" TIMESTAMP(3);

-- Whoever owns an organization that is trialing today has had their trial.
UPDATE "user"
SET "trialClaimedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "member"
  JOIN "subscription" ON "subscription"."organizationId" = "member"."organizationId"
  WHERE "member"."userId" = "user"."id"
    AND "member"."role" = 'owner'
    AND "subscription"."status" = 'trialing'
);
