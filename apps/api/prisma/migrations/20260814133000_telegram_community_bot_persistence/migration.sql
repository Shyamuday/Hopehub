CREATE TABLE "TelegramCommunityState" (
  "id" TEXT NOT NULL,
  "bot" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "payload" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunityState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramCommunitySubmission" (
  "id" TEXT NOT NULL,
  "serial" BIGSERIAL NOT NULL,
  "reference" TEXT NOT NULL,
  "bot" TEXT NOT NULL,
  "userChatId" TEXT NOT NULL,
  "firstName" TEXT,
  "username" TEXT,
  "category" TEXT,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "groupChatId" TEXT,
  "groupMessageId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunitySubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramWebhookReceipt" (
  "id" TEXT NOT NULL,
  "bot" TEXT NOT NULL,
  "updateId" BIGINT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramWebhookReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramCommunityState_bot_chatId_key"
  ON "TelegramCommunityState"("bot", "chatId");
CREATE INDEX "TelegramCommunityState_expiresAt_idx"
  ON "TelegramCommunityState"("expiresAt");

CREATE UNIQUE INDEX "TelegramCommunitySubmission_reference_key"
  ON "TelegramCommunitySubmission"("reference");
CREATE UNIQUE INDEX "TelegramCommunitySubmission_serial_key"
  ON "TelegramCommunitySubmission"("serial");
CREATE INDEX "TelegramCommunitySubmission_bot_userChatId_createdAt_idx"
  ON "TelegramCommunitySubmission"("bot", "userChatId", "createdAt");
CREATE INDEX "TelegramCommunitySubmission_bot_groupChatId_groupMessageId_idx"
  ON "TelegramCommunitySubmission"("bot", "groupChatId", "groupMessageId");
CREATE INDEX "TelegramCommunitySubmission_bot_status_createdAt_idx"
  ON "TelegramCommunitySubmission"("bot", "status", "createdAt");

CREATE UNIQUE INDEX "TelegramWebhookReceipt_bot_updateId_key"
  ON "TelegramWebhookReceipt"("bot", "updateId");
CREATE INDEX "TelegramWebhookReceipt_status_updatedAt_idx"
  ON "TelegramWebhookReceipt"("status", "updatedAt");
CREATE INDEX "TelegramWebhookReceipt_createdAt_idx"
  ON "TelegramWebhookReceipt"("createdAt");
