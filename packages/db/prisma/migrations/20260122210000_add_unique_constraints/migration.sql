-- CreateIndex
CREATE UNIQUE INDEX "cost_unit_group_title_key" ON "cost_unit_group"("title");

-- CreateIndex
CREATE UNIQUE INDEX "cost_unit_tag_key" ON "cost_unit"("tag");

-- CreateIndex
CREATE INDEX "cost_unit_tag_idx" ON "cost_unit"("tag");
