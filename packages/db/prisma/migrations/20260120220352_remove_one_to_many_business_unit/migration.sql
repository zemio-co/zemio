/*
  Warnings:

  - You are about to drop the `_BusinessUnitToReport` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `businessUnitId` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_BusinessUnitToReport" DROP CONSTRAINT "_BusinessUnitToReport_A_fkey";

-- DropForeignKey
ALTER TABLE "_BusinessUnitToReport" DROP CONSTRAINT "_BusinessUnitToReport_B_fkey";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "businessUnitId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_BusinessUnitToReport";

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
