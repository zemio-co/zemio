-- AlterTable
ALTER TABLE "preferences" ADD COLUMN     "iban" TEXT;

-- CreateIndex
CREATE INDEX "Expense_reportId_idx" ON "Expense"("reportId");

-- CreateIndex
CREATE INDEX "Report_ownerId_idx" ON "Report"("ownerId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_costUnitId_idx" ON "Report"("costUnitId");
