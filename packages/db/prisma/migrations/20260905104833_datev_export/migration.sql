-- CreateEnum
CREATE TYPE "InputTaxRate" AS ENUM ('STANDARD', 'REDUCED', 'NONE');

-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "inputTaxRate" "InputTaxRate";

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "datevExportId" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "datevBeraternummer" INTEGER,
ADD COLUMN     "datevContraAccount" TEXT,
ADD COLUMN     "datevExpenseAccountFood" TEXT,
ADD COLUMN     "datevExpenseAccountReceipt" TEXT,
ADD COLUMN     "datevExpenseAccountTravel" TEXT,
ADD COLUMN     "datevFestschreibung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "datevKontenrahmen" TEXT,
ADD COLUMN     "datevMandantennummer" INTEGER,
ADD COLUMN     "datevSachkontenlaenge" INTEGER,
ADD COLUMN     "datevWirtschaftsjahrBeginn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "datev_export" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "configuration" JSONB NOT NULL,
    "fileKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,

    CONSTRAINT "datev_export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "datev_export_organizationId_createdAt_idx" ON "datev_export"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "report_datevExportId_idx" ON "report"("datevExportId");

-- AddForeignKey
ALTER TABLE "datev_export" ADD CONSTRAINT "datev_export_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datev_export" ADD CONSTRAINT "datev_export_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_datevExportId_fkey" FOREIGN KEY ("datevExportId") REFERENCES "datev_export"("id") ON DELETE SET NULL ON UPDATE CASCADE;
