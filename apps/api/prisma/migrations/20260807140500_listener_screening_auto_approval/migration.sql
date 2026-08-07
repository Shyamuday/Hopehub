ALTER TABLE "CounsellorApplication"
ADD COLUMN "listenerScreeningAnswers" JSONB,
ADD COLUMN "listenerScreeningScore" INTEGER,
ADD COLUMN "listenerScreeningMaxScore" INTEGER,
ADD COLUMN "listenerScreeningPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerScreeningCompletedAt" TIMESTAMP(3),
ADD COLUMN "listenerGuidelinesAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerGuidelinesVersion" TEXT,
ADD COLUMN "listenerGuidelinesReadStartedAt" TIMESTAMP(3),
ADD COLUMN "listenerGuidelinesReadSeconds" INTEGER,
ADD COLUMN "listenerGuidelinesAcceptedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedDoctorUserId" TEXT;

CREATE INDEX "CounsellorApplication_listenerScreeningPassed_idx" ON "CounsellorApplication"("listenerScreeningPassed");
CREATE INDEX "CounsellorApplication_autoApprovedDoctorUserId_idx" ON "CounsellorApplication"("autoApprovedDoctorUserId");
CREATE INDEX "CounsellorApplication_listenerScreeningPassed_listenerScreeningCompletedAt_idx" ON "CounsellorApplication"("listenerScreeningPassed", "listenerScreeningCompletedAt");

UPDATE "CareTeamService"
SET "priceInPaise" = 29900, "isFree" = false, "pricingMode" = 'FIXED'
WHERE "title" = 'Video listener support session';
