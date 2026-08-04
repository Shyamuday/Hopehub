CREATE TYPE "CounsellorApplicationTrack" AS ENUM (
  'PROFESSIONAL_PSYCHOLOGIST',
  'PSYCHOLOGY_STUDENT_VOLUNTEER',
  'PEER_SUPPORT_VOLUNTEER'
);

ALTER TABLE "CounsellorApplication"
  ADD COLUMN "applicationTrack" "CounsellorApplicationTrack" NOT NULL DEFAULT 'PROFESSIONAL_PSYCHOLOGIST',
  ADD COLUMN "supervisionDetails" TEXT,
  ADD COLUMN "livedExperienceSummary" TEXT,
  ADD COLUMN "agreesToNonClinicalRole" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "qualification" DROP NOT NULL,
  ALTER COLUMN "specialization" DROP NOT NULL,
  ALTER COLUMN "experienceYears" DROP NOT NULL,
  ALTER COLUMN "resumeLink" DROP NOT NULL;

CREATE INDEX "CounsellorApplication_applicationTrack_idx" ON "CounsellorApplication"("applicationTrack");
