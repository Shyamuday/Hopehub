ALTER TABLE "CounsellorApplication"
ADD COLUMN "listenerScreeningAnswers" JSONB,
ADD COLUMN "listenerScreeningScore" INTEGER,
ADD COLUMN "listenerScreeningMaxScore" INTEGER,
ADD COLUMN "listenerScreeningPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerScreeningCompletedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedDoctorUserId" TEXT;

CREATE INDEX "CounsellorApplication_listenerScreeningPassed_idx" ON "CounsellorApplication"("listenerScreeningPassed");
CREATE INDEX "CounsellorApplication_autoApprovedDoctorUserId_idx" ON "CounsellorApplication"("autoApprovedDoctorUserId");
