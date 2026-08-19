ALTER TABLE "CareTeamService"
ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "approvalReason" TEXT,
ADD COLUMN "approvalRequestedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT;

CREATE INDEX "CareTeamService_approvalStatus_isActive_idx"
ON "CareTeamService"("approvalStatus", "isActive");
