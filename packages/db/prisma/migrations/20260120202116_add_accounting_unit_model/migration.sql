/*
  Warnings:

  - Added the required column `accountingUnitId` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "accountingUnitId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "accounting_unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "accounting_unit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_accountingUnitId_fkey" FOREIGN KEY ("accountingUnitId") REFERENCES "accounting_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
