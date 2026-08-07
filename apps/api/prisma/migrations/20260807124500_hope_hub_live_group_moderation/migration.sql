ALTER TABLE "HopeHubLiveGroup"
  ADD COLUMN "callTitle" TEXT,
  ADD COLUMN "callAgenda" TEXT,
  ADD COLUMN "slowModeSeconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "HopeHubLiveGroupMessage"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT;

CREATE TABLE "HopeHubLiveGroupMemberModeration" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "reason" TEXT,
    "moderatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HopeHubLiveGroupMemberModeration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HopeHubLiveGroupMemberModeration_groupId_userId_key" ON "HopeHubLiveGroupMemberModeration"("groupId", "userId");
CREATE INDEX "HopeHubLiveGroupMemberModeration_groupId_isMuted_idx" ON "HopeHubLiveGroupMemberModeration"("groupId", "isMuted");
CREATE INDEX "HopeHubLiveGroupMemberModeration_groupId_isBanned_idx" ON "HopeHubLiveGroupMemberModeration"("groupId", "isBanned");
CREATE INDEX "HopeHubLiveGroupMemberModeration_userId_idx" ON "HopeHubLiveGroupMemberModeration"("userId");

ALTER TABLE "HopeHubLiveGroupMemberModeration" ADD CONSTRAINT "HopeHubLiveGroupMemberModeration_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HopeHubLiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
