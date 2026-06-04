/*
  Warnings:

  - You are about to drop the column `departure` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `kilometers` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `receiptFileUrl` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `travelReason` on the `Expense` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "departure",
DROP COLUMN "destination",
DROP COLUMN "kilometers",
DROP COLUMN "reason",
DROP COLUMN "receiptFileUrl",
DROP COLUMN "travelReason";
