CREATE TABLE "MentalHealthProviderProfile" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "licenseNumber" TEXT,
  "licenseCouncil" TEXT,
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "modalities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sessionTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ageGroups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "concernsHandled" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "introSessionTitle" TEXT,
  "counsellingApproach" TEXT,
  "safetyEscalationNote" TEXT,
  "acceptsHighRiskCases" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MentalHealthProviderProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentalHealthProviderProfile_doctorId_key" ON "MentalHealthProviderProfile"("doctorId");
CREATE INDEX "MentalHealthProviderProfile_doctorId_idx" ON "MentalHealthProviderProfile"("doctorId");

ALTER TABLE "MentalHealthProviderProfile"
ADD CONSTRAINT "MentalHealthProviderProfile_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
