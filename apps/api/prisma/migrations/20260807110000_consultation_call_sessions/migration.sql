CREATE TABLE "ConsultationCallSession" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "endReason" TEXT,
    "lastSignalEvent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationCallSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsultationCallSession_consultationId_startedAt_idx" ON "ConsultationCallSession"("consultationId", "startedAt");
CREATE INDEX "ConsultationCallSession_initiatedByUserId_startedAt_idx" ON "ConsultationCallSession"("initiatedByUserId", "startedAt");
CREATE INDEX "ConsultationCallSession_targetUserId_startedAt_idx" ON "ConsultationCallSession"("targetUserId", "startedAt");
CREATE INDEX "ConsultationCallSession_status_idx" ON "ConsultationCallSession"("status");

ALTER TABLE "ConsultationCallSession" ADD CONSTRAINT "ConsultationCallSession_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
