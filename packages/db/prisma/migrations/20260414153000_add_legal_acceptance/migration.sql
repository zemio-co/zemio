CREATE TYPE "LegalAcceptanceType" AS ENUM ('CHECKBOX_AND_BUTTON');

ALTER TABLE "session"
ADD COLUMN "legalAcceptedAt" TIMESTAMP(3),
ADD COLUMN "legalAcceptedReleaseVersion" TEXT;

CREATE TABLE "legal_acceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "releaseVersion" TEXT NOT NULL,
    "acceptanceType" "LegalAcceptanceType" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentVersions" JSONB NOT NULL,

    CONSTRAINT "legal_acceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_acceptance_userId_releaseVersion_key"
ON "legal_acceptance"("userId", "releaseVersion");

CREATE INDEX "legal_acceptance_userId_idx"
ON "legal_acceptance"("userId");

CREATE INDEX "legal_acceptance_releaseVersion_idx"
ON "legal_acceptance"("releaseVersion");

ALTER TABLE "legal_acceptance"
ADD CONSTRAINT "legal_acceptance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
