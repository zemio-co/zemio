/*
  Warnings:

  - You are about to drop the column `accountingUnitId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `businessUnitId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the `accounting_unit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `business_unit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_accountingUnitId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_businessUnitId_fkey";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "accountingUnitId",
DROP COLUMN "businessUnitId";

-- DropTable
DROP TABLE "accounting_unit";

-- DropTable
DROP TABLE "business_unit";
