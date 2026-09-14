BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES (
  'telegramGroupHelpLiveVoiceImageUrl',
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/community/hopehub-join-live-vc-v2.jpeg',
  'Live VC image URL',
  NOW()
)
ON CONFLICT ("key") DO UPDATE
SET
  "value" = EXCLUDED."value",
  "label" = EXCLUDED."label",
  "updatedAt" = NOW();

COMMIT;
