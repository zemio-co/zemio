-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "departure" TEXT,
ADD COLUMN     "destination" TEXT,
ADD COLUMN     "kilometers" DECIMAL(65,30),
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "receiptFileUrl" TEXT,
ADD COLUMN     "travelReason" TEXT;

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "kilometerRate" DECIMAL(65,30) NOT NULL DEFAULT 0.30,
    "reviewerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
