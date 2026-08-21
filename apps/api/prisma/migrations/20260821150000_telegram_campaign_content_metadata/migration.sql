BEGIN;

ALTER TABLE "TelegramCampaignItem"
  ADD COLUMN "contentCategory" TEXT,
  ADD COLUMN "sourceUrl" TEXT;

UPDATE "TelegramCampaignItem"
SET "kind" = 'TEXT'
WHERE "kind" = 'MESSAGE';

CREATE INDEX "TelegramCampaignItem_contentCategory_idx"
  ON "TelegramCampaignItem"("contentCategory");

COMMIT;
