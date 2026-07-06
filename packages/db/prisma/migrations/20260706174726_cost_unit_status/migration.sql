-- CreateEnum
CREATE TYPE "CostUnitStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "cost_unit" ADD COLUMN     "status" "CostUnitStatus" NOT NULL DEFAULT 'ACTIVE';
