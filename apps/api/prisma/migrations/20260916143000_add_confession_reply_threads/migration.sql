BEGIN;

CREATE TABLE "TelegramConfessionPublication" (
  "id" TEXT NOT NULL,
  "confessionReference" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "messageId" INTEGER NOT NULL,
  "messageThreadId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramConfessionPublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramConfessionPublicReply" (
  "id" TEXT NOT NULL,
  "confessionReference" TEXT NOT NULL,
  "responderChatId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "messageId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramConfessionPublicReply_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramConfessionPublication_confessionReference_chatId_key"
ON "TelegramConfessionPublication"("confessionReference", "chatId");

CREATE UNIQUE INDEX "TelegramConfessionPublication_chatId_messageId_key"
ON "TelegramConfessionPublication"("chatId", "messageId");

CREATE INDEX "TelegramConfessionPublication_confessionReference_idx"
ON "TelegramConfessionPublication"("confessionReference");

CREATE INDEX "TelegramConfessionPublicReply_confessionReference_createdAt_idx"
ON "TelegramConfessionPublicReply"("confessionReference", "createdAt");

CREATE INDEX "TelegramConfessionPublicReply_chatId_messageId_idx"
ON "TelegramConfessionPublicReply"("chatId", "messageId");

CREATE INDEX "TelegramConfessionPublicReply_responderChatId_createdAt_idx"
ON "TelegramConfessionPublicReply"("responderChatId", "createdAt");

COMMIT;
