ALTER TABLE "HopeHubAssessmentAttempt"
  ADD COLUMN "safetyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "safetyReviewedById" TEXT,
  ADD COLUMN "safetyReviewNote" TEXT;

CREATE INDEX "HopeHubAssessmentAttempt_safetyFlag_safetyReviewedAt_idx"
  ON "HopeHubAssessmentAttempt"("safetyFlag", "safetyReviewedAt");

CREATE INDEX "HopeHubAssessmentAttempt_safetyReviewedById_idx"
  ON "HopeHubAssessmentAttempt"("safetyReviewedById");

ALTER TABLE "HopeHubAssessmentAttempt"
  ADD CONSTRAINT "HopeHubAssessmentAttempt_safetyReviewedById_fkey"
  FOREIGN KEY ("safetyReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
