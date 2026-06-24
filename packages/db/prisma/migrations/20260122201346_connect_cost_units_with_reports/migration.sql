-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "costUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_costUnitId_fkey" FOREIGN KEY ("costUnitId") REFERENCES "cost_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
