BEGIN;

ALTER TABLE "TelegramCampaignItem"
ADD COLUMN "deleteAfterMinutes" INTEGER;

COMMIT;
