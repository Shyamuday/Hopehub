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
ADD COLUMN "listenerTrainingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerTrainingVersion" TEXT,
ADD COLUMN "listenerTrainingCompletedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedDoctorUserId" TEXT;

CREATE INDEX "CounsellorApplication_listenerScreeningPassed_idx" ON "CounsellorApplication"("listenerScreeningPassed");
CREATE INDEX "CounsellorApplication_autoApprovedDoctorUserId_idx" ON "CounsellorApplication"("autoApprovedDoctorUserId");
CREATE INDEX "CounsellorApplication_listenerScreeningPassed_listenerScreeningCompletedAt_idx" ON "CounsellorApplication"("listenerScreeningPassed", "listenerScreeningCompletedAt");

CREATE TABLE "ListenerGuidelineReadSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "applicationTrack" "CounsellorApplicationTrack" NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "guidelinesVersion" TEXT NOT NULL,
  "minReadSeconds" INTEGER NOT NULL DEFAULT 120,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListenerGuidelineReadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListenerGuidelineReadSession_tokenHash_key" ON "ListenerGuidelineReadSession"("tokenHash");
CREATE INDEX "ListenerGuidelineReadSession_email_startedAt_idx" ON "ListenerGuidelineReadSession"("email", "startedAt");
CREATE INDEX "ListenerGuidelineReadSession_phone_startedAt_idx" ON "ListenerGuidelineReadSession"("phone", "startedAt");
CREATE INDEX "ListenerGuidelineReadSession_tokenHash_idx" ON "ListenerGuidelineReadSession"("tokenHash");
CREATE INDEX "ListenerGuidelineReadSession_expiresAt_idx" ON "ListenerGuidelineReadSession"("expiresAt");

CREATE TABLE "ListenerScreeningAttempt" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT,
  "applicationTrack" "CounsellorApplicationTrack" NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "guidelinesAccepted" BOOLEAN NOT NULL DEFAULT false,
  "guidelinesVersion" TEXT,
  "guidelinesReadSessionId" TEXT,
  "guidelinesReadSeconds" INTEGER,
  "trainingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "trainingVersion" TEXT,
  "cooldownExpiresAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'healing-web',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListenerScreeningAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListenerScreeningAttempt_email_createdAt_idx" ON "ListenerScreeningAttempt"("email", "createdAt");
CREATE INDEX "ListenerScreeningAttempt_phone_createdAt_idx" ON "ListenerScreeningAttempt"("phone", "createdAt");
CREATE INDEX "ListenerScreeningAttempt_passed_createdAt_idx" ON "ListenerScreeningAttempt"("passed", "createdAt");
CREATE INDEX "ListenerScreeningAttempt_cooldownExpiresAt_idx" ON "ListenerScreeningAttempt"("cooldownExpiresAt");
CREATE INDEX "ListenerScreeningAttempt_applicationId_idx" ON "ListenerScreeningAttempt"("applicationId");
ALTER TABLE "ListenerScreeningAttempt" ADD CONSTRAINT "ListenerScreeningAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CounsellorApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "CareTeamService"
SET "priceInPaise" = 29900, "isFree" = false, "pricingMode" = 'FIXED'
WHERE "title" = 'Video listener support session';
