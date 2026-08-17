ALTER TABLE "TelegramCampaignDelivery"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextRetryAt" TIMESTAMP(3);

CREATE INDEX "TelegramCampaignDelivery_status_nextRetryAt_idx"
ON "TelegramCampaignDelivery"("status", "nextRetryAt");

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES ('telegramGroupHelpTestGroupChatId', '@hopehubtalks', 'Test Telegram group ID', NOW())
ON CONFLICT ("key") DO UPDATE
SET "value" = CASE
  WHEN TRIM("SiteConfig"."value") = '' THEN EXCLUDED."value"
  ELSE "SiteConfig"."value"
END,
"label" = EXCLUDED."label",
"updatedAt" = NOW();
