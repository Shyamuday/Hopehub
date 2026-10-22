BEGIN;

ALTER TABLE "TelegramCommunityModerationCase"
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "reporterLabel" TEXT,
  ADD COLUMN "reporterUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "reportCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "targetLabel" TEXT,
  ADD COLUMN "originalMessageUrl" TEXT,
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "assignedToLabel" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "staffChatId" TEXT,
  ADD COLUMN "staffMessageId" INTEGER,
  ADD COLUMN "staffMessageIsCaption" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "TelegramCommunityModerationCase_dedupeKey_key"
  ON "TelegramCommunityModerationCase"("dedupeKey");

CREATE INDEX "TelegramCommunityModerationCase_status_assignedAt_createdAt_idx"
  ON "TelegramCommunityModerationCase"("status", "assignedAt", "createdAt");

COMMIT;
