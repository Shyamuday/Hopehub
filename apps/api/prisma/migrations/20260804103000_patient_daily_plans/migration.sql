-- Patient-owned daily planning, task review, and image attachments.

CREATE TABLE "PatientDailyPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planDate" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "focus" TEXT,
  "summary" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatientDailyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientDailyPlanTask" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "reviewTick" BOOLEAN NOT NULL DEFAULT false,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatientDailyPlanTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientDailyPlanImage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "taskId" TEXT,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileName" TEXT,
  "byteSize" INTEGER NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientDailyPlanImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientDailyPlan_userId_planDate_key" ON "PatientDailyPlan"("userId", "planDate");
CREATE INDEX "PatientDailyPlan_userId_planDate_idx" ON "PatientDailyPlan"("userId", "planDate");
CREATE INDEX "PatientDailyPlanTask_planId_sortOrder_idx" ON "PatientDailyPlanTask"("planId", "sortOrder");
CREATE INDEX "PatientDailyPlanImage_userId_createdAt_idx" ON "PatientDailyPlanImage"("userId", "createdAt");
CREATE INDEX "PatientDailyPlanImage_planId_createdAt_idx" ON "PatientDailyPlanImage"("planId", "createdAt");
CREATE INDEX "PatientDailyPlanImage_taskId_idx" ON "PatientDailyPlanImage"("taskId");

ALTER TABLE "PatientDailyPlan"
  ADD CONSTRAINT "PatientDailyPlan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientDailyPlanTask"
  ADD CONSTRAINT "PatientDailyPlanTask_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "PatientDailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientDailyPlanImage"
  ADD CONSTRAINT "PatientDailyPlanImage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientDailyPlanImage"
  ADD CONSTRAINT "PatientDailyPlanImage_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "PatientDailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientDailyPlanImage"
  ADD CONSTRAINT "PatientDailyPlanImage_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "PatientDailyPlanTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
