-- AlterEnum
ALTER TYPE "LegalAcceptanceType" ADD VALUE 'IMPLICIT_ON_SIGNUP';

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "id" DROP DEFAULT;
