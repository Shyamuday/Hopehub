-- Three Telegram bot foundation: user, doctor, and admin/ops bot sessions.

CREATE TYPE "TelegramBotKind" AS ENUM ('USER', 'DOCTOR', 'ADMIN');

CREATE TABLE "TelegramBotSession" (
  "id" TEXT NOT NULL,
  "botKind" "TelegramBotKind" NOT NULL,
  "chatId" TEXT NOT NULL,
  "telegramUserId" TEXT,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "linkedUserId" TEXT,
  "state" TEXT NOT NULL DEFAULT 'NEW',
  "lastCommand" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TelegramBotSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramBotEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "botKind" "TelegramBotKind" NOT NULL,
  "updateId" BIGINT,
  "chatId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramBotEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramBotSession_botKind_chatId_key" ON "TelegramBotSession"("botKind", "chatId");
CREATE INDEX "TelegramBotSession_telegramUserId_idx" ON "TelegramBotSession"("telegramUserId");
CREATE INDEX "TelegramBotSession_linkedUserId_idx" ON "TelegramBotSession"("linkedUserId");
CREATE INDEX "TelegramBotSession_botKind_updatedAt_idx" ON "TelegramBotSession"("botKind", "updatedAt");
CREATE INDEX "TelegramBotEvent_sessionId_createdAt_idx" ON "TelegramBotEvent"("sessionId", "createdAt");
CREATE INDEX "TelegramBotEvent_botKind_createdAt_idx" ON "TelegramBotEvent"("botKind", "createdAt");
CREATE INDEX "TelegramBotEvent_updateId_idx" ON "TelegramBotEvent"("updateId");

ALTER TABLE "TelegramBotSession"
  ADD CONSTRAINT "TelegramBotSession_linkedUserId_fkey"
  FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TelegramBotEvent"
  ADD CONSTRAINT "TelegramBotEvent_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TelegramBotSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
