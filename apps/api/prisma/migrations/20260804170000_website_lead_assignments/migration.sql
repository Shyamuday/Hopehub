CREATE TYPE "WebsiteLeadAssignmentType" AS ENUM ('VOLUNTEER', 'PSYCHOLOGIST', 'ADMIN');

CREATE TYPE "WebsiteLeadAssignmentStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CONTACTED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "WebsiteLeadAssignment" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "providerId" TEXT,
  "assignedById" TEXT,
  "assignmentType" "WebsiteLeadAssignmentType" NOT NULL,
  "status" "WebsiteLeadAssignmentStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "contactedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebsiteLeadAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WebsiteLeadAssignment"
  ADD CONSTRAINT "WebsiteLeadAssignment_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "WebsiteLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteLeadAssignment"
  ADD CONSTRAINT "WebsiteLeadAssignment_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WebsiteLeadAssignment"
  ADD CONSTRAINT "WebsiteLeadAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WebsiteLeadAssignment_leadId_idx" ON "WebsiteLeadAssignment"("leadId");
CREATE INDEX "WebsiteLeadAssignment_providerId_idx" ON "WebsiteLeadAssignment"("providerId");
CREATE INDEX "WebsiteLeadAssignment_assignedById_idx" ON "WebsiteLeadAssignment"("assignedById");
CREATE INDEX "WebsiteLeadAssignment_status_idx" ON "WebsiteLeadAssignment"("status");
CREATE INDEX "WebsiteLeadAssignment_assignmentType_idx" ON "WebsiteLeadAssignment"("assignmentType");
CREATE INDEX "WebsiteLeadAssignment_assignedAt_idx" ON "WebsiteLeadAssignment"("assignedAt");
