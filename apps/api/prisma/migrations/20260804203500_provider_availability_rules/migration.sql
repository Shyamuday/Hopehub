-- Recurring provider availability rules and service-aware slot metadata

ALTER TABLE "DoctorSlot"
  ADD COLUMN IF NOT EXISTS "careTeamServiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "generatedByRuleId" TEXT,
  ADD COLUMN IF NOT EXISTS "bufferMinutes" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ProviderAvailabilityRule" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "careTeamServiceId" TEXT,
  "label" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  "maxSessionsPerDay" INTEGER,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProviderAvailabilityRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DoctorSlot_careTeamServiceId_idx" ON "DoctorSlot"("careTeamServiceId");
CREATE INDEX IF NOT EXISTS "DoctorSlot_generatedByRuleId_idx" ON "DoctorSlot"("generatedByRuleId");
CREATE INDEX IF NOT EXISTS "ProviderAvailabilityRule_doctorId_weekday_isActive_idx" ON "ProviderAvailabilityRule"("doctorId", "weekday", "isActive");
CREATE INDEX IF NOT EXISTS "ProviderAvailabilityRule_careTeamServiceId_idx" ON "ProviderAvailabilityRule"("careTeamServiceId");

DO $$ BEGIN
  ALTER TABLE "DoctorSlot"
    ADD CONSTRAINT "DoctorSlot_careTeamServiceId_fkey"
    FOREIGN KEY ("careTeamServiceId") REFERENCES "CareTeamService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderAvailabilityRule"
    ADD CONSTRAINT "ProviderAvailabilityRule_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderAvailabilityRule"
    ADD CONSTRAINT "ProviderAvailabilityRule_careTeamServiceId_fkey"
    FOREIGN KEY ("careTeamServiceId") REFERENCES "CareTeamService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DoctorSlot"
    ADD CONSTRAINT "DoctorSlot_generatedByRuleId_fkey"
    FOREIGN KEY ("generatedByRuleId") REFERENCES "ProviderAvailabilityRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
