-- Composite index for the listOwn query which always filters by both
-- ownerId and organizationId simultaneously.
CREATE INDEX "report_ownerId_organizationId_idx" ON "report"("ownerId", "organizationId");

-- Indexes for the sortable and filterable date fields used in the
-- reports list (default sort is createdAt DESC).
CREATE INDEX "report_createdAt_idx" ON "report"("createdAt");

CREATE INDEX "report_lastUpdatedAt_idx" ON "report"("lastUpdatedAt");
