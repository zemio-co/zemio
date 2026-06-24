-- CreateTable
CREATE TABLE "business_unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BusinessUnitToReport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BusinessUnitToReport_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_unit_name_key" ON "business_unit"("name");

-- CreateIndex
CREATE INDEX "_BusinessUnitToReport_B_index" ON "_BusinessUnitToReport"("B");

-- AddForeignKey
ALTER TABLE "_BusinessUnitToReport" ADD CONSTRAINT "_BusinessUnitToReport_A_fkey" FOREIGN KEY ("A") REFERENCES "business_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessUnitToReport" ADD CONSTRAINT "_BusinessUnitToReport_B_fkey" FOREIGN KEY ("B") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
