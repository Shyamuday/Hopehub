-- Online doctor instant consult (parallel to clinic queue)

CREATE TYPE "OnlineDoctorCategory" AS ENUM ('GENERALIST', 'SPECIALIST');
CREATE TYPE "LivePresenceStatus" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'ON_CALL');
CREATE TYPE "ConsultationMode" AS ENUM ('CLINIC_QUEUE', 'INSTANT_ONLINE');

ALTER TABLE "Consultation" ADD COLUMN IF NOT EXISTS "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'CLINIC_QUEUE';
ALTER TABLE "Consultation" ADD COLUMN IF NOT EXISTS "preferredDoctorUserId" TEXT;

CREATE INDEX IF NOT EXISTS "Consultation_consultationMode_idx" ON "Consultation"("consultationMode");
CREATE INDEX IF NOT EXISTS "Consultation_preferredDoctorUserId_idx" ON "Consultation"("preferredDoctorUserId");

CREATE TABLE IF NOT EXISTS "DoctorOnlineSession" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "category" "OnlineDoctorCategory" NOT NULL DEFAULT 'GENERALIST',
  "specialtyDiseaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "liveStatus" "LivePresenceStatus" NOT NULL DEFAULT 'OFFLINE',
  "acceptsChat" BOOLEAN NOT NULL DEFAULT true,
  "acceptsVoiceCall" BOOLEAN NOT NULL DEFAULT true,
  "lastHeartbeatAt" TIMESTAMP(3),
  "wentLiveAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DoctorOnlineSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DoctorOnlineSession_doctorId_key" ON "DoctorOnlineSession"("doctorId");
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorOnlineSession_userId_key" ON "DoctorOnlineSession"("userId");
CREATE INDEX IF NOT EXISTS "DoctorOnlineSession_liveStatus_enabled_idx" ON "DoctorOnlineSession"("liveStatus", "enabled");
CREATE INDEX IF NOT EXISTS "DoctorOnlineSession_lastHeartbeatAt_idx" ON "DoctorOnlineSession"("lastHeartbeatAt");

ALTER TABLE "DoctorOnlineSession" ADD CONSTRAINT "DoctorOnlineSession_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorOnlineSession" ADD CONSTRAINT "DoctorOnlineSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
