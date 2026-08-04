ALTER TABLE "CounsellorApplication"
  ADD COLUMN "careTeamType" "CareTeamMemberType" NOT NULL DEFAULT 'MENTAL_WELLNESS_PROFESSIONAL',
  ADD COLUMN "qualifiedFrom" TEXT;

CREATE INDEX "CounsellorApplication_careTeamType_idx"
  ON "CounsellorApplication"("careTeamType");

ALTER TABLE "CareContributor"
  ADD COLUMN "careTeamType" "CareTeamMemberType" NOT NULL DEFAULT 'MENTAL_WELLNESS_PROFESSIONAL',
  ADD COLUMN "qualifiedFrom" TEXT;

CREATE INDEX "CareContributor_careTeamType_idx"
  ON "CareContributor"("careTeamType");
