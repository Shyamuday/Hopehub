-- Consultation booking reminder queue

DO $$ BEGIN
  CREATE TYPE "ConsultationReminderType" AS ENUM (
    'SESSION_24H',
    'SESSION_1H',
    'MISSED_SESSION_FOLLOW_UP',
    'ADMIN_UNASSIGNED_ALERT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConsultationReminderStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ConsultationReminder" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "type" "ConsultationReminderType" NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "ConsultationReminderStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsultationReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsultationReminder_consultationId_recipientUserId_type_key"
  ON "ConsultationReminder"("consultationId", "recipientUserId", "type");
CREATE INDEX IF NOT EXISTS "ConsultationReminder_status_scheduledFor_idx"
  ON "ConsultationReminder"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "ConsultationReminder_recipientUserId_status_idx"
  ON "ConsultationReminder"("recipientUserId", "status");
CREATE INDEX IF NOT EXISTS "ConsultationReminder_consultationId_idx"
  ON "ConsultationReminder"("consultationId");

DO $$ BEGIN
  ALTER TABLE "ConsultationReminder"
    ADD CONSTRAINT "ConsultationReminder_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConsultationReminder"
    ADD CONSTRAINT "ConsultationReminder_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
