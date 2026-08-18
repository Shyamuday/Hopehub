CREATE TABLE "TelegramCommunityGroupPolicy" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "settings" JSONB NOT NULL,
  "lockdownUntil" TIMESTAMP(3),
  "lockdownReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunityGroupPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramCommunityGroupPolicy_chatId_key" ON "TelegramCommunityGroupPolicy"("chatId");
CREATE INDEX "TelegramCommunityGroupPolicy_lockdownUntil_idx" ON "TelegramCommunityGroupPolicy"("lockdownUntil");

CREATE TABLE "TelegramCommunityModerationCase" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "sourceMessageId" INTEGER,
  "reportedMessageId" INTEGER,
  "reporterUserId" TEXT,
  "targetUserId" TEXT,
  "reason" TEXT NOT NULL,
  "evidence" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "action" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunityModerationCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelegramCommunityModerationCase_chatId_status_createdAt_idx" ON "TelegramCommunityModerationCase"("chatId", "status", "createdAt");
CREATE INDEX "TelegramCommunityModerationCase_targetUserId_createdAt_idx" ON "TelegramCommunityModerationCase"("targetUserId", "createdAt");
