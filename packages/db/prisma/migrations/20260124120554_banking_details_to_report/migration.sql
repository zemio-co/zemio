/*
  Warnings:

  - Added the required column `bankingDetailsId` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "bankingDetailsId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_bankingDetailsId_fkey" FOREIGN KEY ("bankingDetailsId") REFERENCES "banking_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
