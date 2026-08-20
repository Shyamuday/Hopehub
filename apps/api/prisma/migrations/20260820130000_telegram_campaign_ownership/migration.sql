BEGIN;

ALTER TABLE "TelegramCampaign"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'ADMIN',
ADD COLUMN "templateVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "TelegramCampaign"
SET "source" = 'SYSTEM', "templateVersion" = 1
WHERE "id" LIKE 'seed\_telegram\_%' ESCAPE '\';

COMMIT;
