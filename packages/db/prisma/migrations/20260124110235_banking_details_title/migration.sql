/*
  Warnings:

  - Added the required column `title` to the `banking_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "banking_details" ADD COLUMN     "title" TEXT NOT NULL;
