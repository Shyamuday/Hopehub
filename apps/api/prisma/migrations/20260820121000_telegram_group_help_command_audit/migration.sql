CREATE TABLE "TelegramGroupHelpCommandAudit" (
  "id" TEXT NOT NULL,
  "sourceChatId" TEXT NOT NULL,
  "targetChatId" TEXT,
  "actorUserId" TEXT,
  "command" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramGroupHelpCommandAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelegramGroupHelpCommandAudit_status_createdAt_idx"
  ON "TelegramGroupHelpCommandAudit"("status", "createdAt");
CREATE INDEX "TelegramGroupHelpCommandAudit_sourceChatId_createdAt_idx"
  ON "TelegramGroupHelpCommandAudit"("sourceChatId", "createdAt");
CREATE INDEX "TelegramGroupHelpCommandAudit_actorUserId_createdAt_idx"
  ON "TelegramGroupHelpCommandAudit"("actorUserId", "createdAt");
