CREATE TABLE "TelegramCommunityMessageCleanup" (
  "id" TEXT NOT NULL,
  "bot" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "messageId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "deleteAfter" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunityMessageCleanup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramCommunityMessageCleanup_bot_chatId_messageId_key"
  ON "TelegramCommunityMessageCleanup"("bot", "chatId", "messageId");
CREATE INDEX "TelegramCommunityMessageCleanup_deleteAfter_idx"
  ON "TelegramCommunityMessageCleanup"("deleteAfter");
