BEGIN;

CREATE TABLE "ConsultationCallEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "consultationId" TEXT NOT NULL,
  "callId" TEXT,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "event" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "reason" TEXT,
  "sequence" INTEGER,
  "clientOccurredAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsultationCallEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ConsultationCallEvent"
  ADD CONSTRAINT "ConsultationCallEvent_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ConsultationCallSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ConsultationCallEvent_sessionId_createdAt_idx"
  ON "ConsultationCallEvent"("sessionId", "createdAt");
CREATE INDEX "ConsultationCallEvent_consultationId_createdAt_idx"
  ON "ConsultationCallEvent"("consultationId", "createdAt");
CREATE INDEX "ConsultationCallEvent_callId_createdAt_idx"
  ON "ConsultationCallEvent"("callId", "createdAt");
CREATE INDEX "ConsultationCallEvent_event_createdAt_idx"
  ON "ConsultationCallEvent"("event", "createdAt");
CREATE INDEX "ConsultationCallEvent_outcome_createdAt_idx"
  ON "ConsultationCallEvent"("outcome", "createdAt");
CREATE INDEX "ConsultationCallEvent_createdAt_idx"
  ON "ConsultationCallEvent"("createdAt");

COMMIT;
