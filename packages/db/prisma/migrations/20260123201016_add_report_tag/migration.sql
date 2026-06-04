/*
  Warnings:

  - A unique constraint covering the columns `[tag]` on the table `Report` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "tag" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Report_tag_key" ON "Report"("tag");
