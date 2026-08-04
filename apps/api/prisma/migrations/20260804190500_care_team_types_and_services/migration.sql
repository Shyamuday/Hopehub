CREATE TYPE "CareTeamMemberType" AS ENUM (
  'MENTAL_WELLNESS_PROFESSIONAL',
  'QUALIFIED_COUNSELLOR',
  'PSYCHOLOGY_STUDENT_VOLUNTEER',
  'PEER_SUPPORT_VOLUNTEER',
  'NLP_COACH',
  'LIFE_COACH',
  'MEDITATION_BREATHWORK_GUIDE',
  'CAREER_STUDY_MENTOR'
);

ALTER TABLE "MentalHealthProviderProfile"
  ADD COLUMN "careTeamType" "CareTeamMemberType" NOT NULL DEFAULT 'MENTAL_WELLNESS_PROFESSIONAL',
  ADD COLUMN "qualifiedFrom" TEXT;

CREATE INDEX "MentalHealthProviderProfile_careTeamType_idx"
  ON "MentalHealthProviderProfile"("careTeamType");

CREATE TABLE "CareTeamService" (
  "id" TEXT NOT NULL,
  "mentalHealthProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priceInPaise" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareTeamService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareTeamService_mentalHealthProfileId_isActive_sortOrder_idx"
  ON "CareTeamService"("mentalHealthProfileId", "isActive", "sortOrder");

ALTER TABLE "CareTeamService"
  ADD CONSTRAINT "CareTeamService_mentalHealthProfileId_fkey"
  FOREIGN KEY ("mentalHealthProfileId") REFERENCES "MentalHealthProviderProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
