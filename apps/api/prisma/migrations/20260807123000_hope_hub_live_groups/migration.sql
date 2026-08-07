CREATE TABLE "HopeHubLiveGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LIVE',
    "mode" TEXT NOT NULL DEFAULT 'CHAT',
    "hostUserId" TEXT,
    "createdByUserId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HopeHubLiveGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HopeHubLiveGroupMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HopeHubLiveGroupMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HopeHubLiveGroup_slug_key" ON "HopeHubLiveGroup"("slug");
CREATE INDEX "HopeHubLiveGroup_status_isActive_idx" ON "HopeHubLiveGroup"("status", "isActive");
CREATE INDEX "HopeHubLiveGroup_hostUserId_idx" ON "HopeHubLiveGroup"("hostUserId");
CREATE INDEX "HopeHubLiveGroup_createdByUserId_idx" ON "HopeHubLiveGroup"("createdByUserId");
CREATE INDEX "HopeHubLiveGroupMessage_groupId_createdAt_idx" ON "HopeHubLiveGroupMessage"("groupId", "createdAt");
CREATE INDEX "HopeHubLiveGroupMessage_senderId_createdAt_idx" ON "HopeHubLiveGroupMessage"("senderId", "createdAt");

ALTER TABLE "HopeHubLiveGroupMessage" ADD CONSTRAINT "HopeHubLiveGroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HopeHubLiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "HopeHubLiveGroup" (
  "id",
  "title",
  "slug",
  "description",
  "status",
  "mode",
  "isPublic",
  "isActive",
  "startsAt",
  "createdAt",
  "updatedAt"
) VALUES (
  'hopehub-live-open-circle',
  'Open Hope Circle',
  'open-hope-circle',
  'A moderated live group space for gentle check-ins, emotional support, and next-step guidance.',
  'LIVE',
  'CHAT',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("slug") DO NOTHING;
