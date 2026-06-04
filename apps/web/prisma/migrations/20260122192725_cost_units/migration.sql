-- CreateTable
CREATE TABLE "cost_unit_group" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_unit_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_unit" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "examples" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "costUnitGroupId" TEXT NOT NULL,

    CONSTRAINT "cost_unit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cost_unit" ADD CONSTRAINT "cost_unit_costUnitGroupId_fkey" FOREIGN KEY ("costUnitGroupId") REFERENCES "cost_unit_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
