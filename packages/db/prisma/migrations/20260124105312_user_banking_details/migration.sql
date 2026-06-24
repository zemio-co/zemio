-- CreateTable
CREATE TABLE "banking_details" (
    "id" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banking_details_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "banking_details" ADD CONSTRAINT "banking_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
