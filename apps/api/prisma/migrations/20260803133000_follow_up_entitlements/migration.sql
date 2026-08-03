CREATE TYPE "FollowUpEntitlementStatus" AS ENUM (
  'AVAILABLE',
  'REQUESTED',
  'SCHEDULED',
  'USED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TABLE "ConsultationFollowUpEntitlement" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 15,
  "status" "FollowUpEntitlementStatus" NOT NULL DEFAULT 'AVAILABLE',
  "source" TEXT NOT NULL DEFAULT 'single_session_offer',
  "availableAfter" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "requestedAt" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConsultationFollowUpEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsultationFollowUpEntitlement_consultationId_key"
ON "ConsultationFollowUpEntitlement"("consultationId");

CREATE INDEX "ConsultationFollowUpEntitlement_patientId_status_idx"
ON "ConsultationFollowUpEntitlement"("patientId", "status");

CREATE INDEX "ConsultationFollowUpEntitlement_expiresAt_idx"
ON "ConsultationFollowUpEntitlement"("expiresAt");

ALTER TABLE "ConsultationFollowUpEntitlement"
ADD CONSTRAINT "ConsultationFollowUpEntitlement_consultationId_fkey"
FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultationFollowUpEntitlement"
ADD CONSTRAINT "ConsultationFollowUpEntitlement_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
