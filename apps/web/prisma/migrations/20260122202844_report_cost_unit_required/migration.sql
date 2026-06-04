/*
  Warnings:

  - Made the column `costUnitId` on table `Report` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "costUnitId" SET NOT NULL;
