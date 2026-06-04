/*
  Warnings:

  - You are about to drop the column `notificationPreference` on the `preferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "preferences" DROP COLUMN "notificationPreference",
ADD COLUMN     "notifications" "NotificationPreference" NOT NULL DEFAULT 'ALL';
