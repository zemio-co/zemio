-- Onboarding: the one fact worth storing about it.
--
-- Every other step is derivable from the user row — a verified address, a
-- name, a membership. Whether somebody has *been through the flow* is not,
-- and it is a different question from whether they belong to an organization
-- today: a person removed from their last one has answered the first and not
-- the second.

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- Grandfather everyone who already exists, whether or not they belong to an
-- organization today.
--
-- Without this line, deploy day puts the entire user base into the onboarding
-- funnel, including people who have been working in Zemio for months. Someone
-- with no organization is not a counter-example: they have already been
-- through whatever way in existed when they arrived, and they belong on the
-- page that offers them an invitation or an organization to create — not at
-- the start of a flow whose first two steps they have nothing left to do in.
--
-- `createdAt` rather than `now()`: the column records when onboarding was
-- finished, and stamping the migration's own timestamp onto years of existing
-- accounts would make that a lie in every row it touched.
UPDATE "user" SET "onboardingCompletedAt" = "createdAt";
