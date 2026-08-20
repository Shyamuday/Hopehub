ALTER TABLE "TelegramWebhookReceipt"
  ADD COLUMN "payload" JSONB,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX "TelegramWebhookReceipt_status_nextAttemptAt_idx"
  ON "TelegramWebhookReceipt"("status", "nextAttemptAt");
