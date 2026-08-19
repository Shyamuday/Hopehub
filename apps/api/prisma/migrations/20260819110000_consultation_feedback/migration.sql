CREATE TABLE "ConsultationFeedback" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "helpful" BOOLEAN,
  "followUpNeeded" BOOLEAN,
  "tags" JSONB,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConsultationFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsultationFeedback_consultationId_actorUserId_key"
  ON "ConsultationFeedback"("consultationId", "actorUserId");
CREATE INDEX "ConsultationFeedback_consultationId_actorRole_idx"
  ON "ConsultationFeedback"("consultationId", "actorRole");
CREATE INDEX "ConsultationFeedback_actorUserId_createdAt_idx"
  ON "ConsultationFeedback"("actorUserId", "createdAt");

ALTER TABLE "ConsultationFeedback"
  ADD CONSTRAINT "ConsultationFeedback_consultationId_fkey"
  FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
