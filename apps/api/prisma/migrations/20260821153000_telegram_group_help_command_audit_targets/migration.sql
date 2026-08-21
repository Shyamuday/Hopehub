BEGIN;

ALTER TABLE "TelegramGroupHelpCommandAudit"
  ADD COLUMN "targetUserId" TEXT,
  ADD COLUMN "targetUsername" TEXT,
  ADD COLUMN "targetName" TEXT;

CREATE INDEX "TelegramGroupHelpCommandAudit_targetUserId_createdAt_idx"
  ON "TelegramGroupHelpCommandAudit"("targetUserId", "createdAt");

COMMIT;
