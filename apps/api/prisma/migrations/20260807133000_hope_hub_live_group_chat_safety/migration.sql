ALTER TABLE "HopeHubLiveGroup"
  ADD COLUMN "pinnedMessage" TEXT,
  ADD COLUMN "roomRules" TEXT;

CREATE TABLE "HopeHubLiveGroupReport" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "messageId" TEXT,
    "reporterUserId" TEXT NOT NULL,
    "reporterName" TEXT,
    "targetUserId" TEXT,
    "targetDisplayName" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HopeHubLiveGroupReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HopeHubLiveGroupReport_groupId_status_idx" ON "HopeHubLiveGroupReport"("groupId", "status");
CREATE INDEX "HopeHubLiveGroupReport_messageId_idx" ON "HopeHubLiveGroupReport"("messageId");
CREATE INDEX "HopeHubLiveGroupReport_reporterUserId_createdAt_idx" ON "HopeHubLiveGroupReport"("reporterUserId", "createdAt");
CREATE INDEX "HopeHubLiveGroupReport_targetUserId_idx" ON "HopeHubLiveGroupReport"("targetUserId");

ALTER TABLE "HopeHubLiveGroupReport" ADD CONSTRAINT "HopeHubLiveGroupReport_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HopeHubLiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HopeHubLiveGroupReport" ADD CONSTRAINT "HopeHubLiveGroupReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "HopeHubLiveGroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
