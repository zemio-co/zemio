/*
  Warnings:

  - You are about to drop the column `accountName` on the `banking_details` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `banking_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "banking_details" DROP COLUMN "accountName",
ADD COLUMN     "fullName" TEXT NOT NULL;
