/*
  Warnings:

  - You are about to drop the column `admin` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "cost_unit_tag_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "admin";
