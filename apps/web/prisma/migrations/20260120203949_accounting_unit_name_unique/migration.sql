/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `accounting_unit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "accounting_unit" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "accounting_unit_name_key" ON "accounting_unit"("name");
