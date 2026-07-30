CREATE TABLE "AuthProcessLog" (
    "id" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "reason" TEXT,
    "route" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeAfter" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthProcessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthProcessLog_identifier_createdAt_idx" ON "AuthProcessLog"("identifier", "createdAt");
CREATE INDEX "AuthProcessLog_processType_step_status_idx" ON "AuthProcessLog"("processType", "step", "status");
CREATE INDEX "AuthProcessLog_purgeAfter_idx" ON "AuthProcessLog"("purgeAfter");
