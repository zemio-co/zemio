-- AlterTable: add size and originalName to attachment
ALTER TABLE "attachment" ADD COLUMN "size" INTEGER NOT NULL DEFAULT 0,
                         ADD COLUMN "originalName" TEXT NOT NULL DEFAULT '';
