-- CreateTable
CREATE TABLE "audit_event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_event_organizationId_createdAt_idx" ON "audit_event"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_event_entityType_entityId_createdAt_idx" ON "audit_event"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_event_actorId_idx" ON "audit_event"("actorId");

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
