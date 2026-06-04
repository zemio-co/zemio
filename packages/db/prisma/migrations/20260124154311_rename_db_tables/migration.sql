/*
  Warnings:

  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_reportId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_bankingDetailsId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_costUnitId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "attachment" DROP CONSTRAINT "attachment_expenseId_fkey";

-- DropTable
DROP TABLE "Expense";

-- DropTable
DROP TABLE "Report";

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "tag" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "costUnitId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bankingDetailsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "meta" JSONB NOT NULL,
    "reportId" TEXT NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_tag_key" ON "report"("tag");

-- CreateIndex
CREATE INDEX "report_ownerId_idx" ON "report"("ownerId");

-- CreateIndex
CREATE INDEX "report_status_idx" ON "report"("status");

-- CreateIndex
CREATE INDEX "report_costUnitId_idx" ON "report"("costUnitId");

-- CreateIndex
CREATE INDEX "report_bankingDetailsId_idx" ON "report"("bankingDetailsId");

-- CreateIndex
CREATE INDEX "expense_reportId_idx" ON "expense"("reportId");

-- CreateIndex
CREATE INDEX "attachment_expenseId_idx" ON "attachment"("expenseId");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_costUnitId_fkey" FOREIGN KEY ("costUnitId") REFERENCES "cost_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_bankingDetailsId_fkey" FOREIGN KEY ("bankingDetailsId") REFERENCES "banking_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
