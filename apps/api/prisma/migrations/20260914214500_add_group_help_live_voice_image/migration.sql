BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES (
  'telegramGroupHelpLiveVoiceImageUrl',
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/community/hopehub-live-voice-chat-v1.png',
  'Live VC image URL',
  NOW()
)
ON CONFLICT ("key") DO UPDATE
SET
  "value" = CASE
    WHEN NULLIF(BTRIM("SiteConfig"."value"), '') IS NULL THEN EXCLUDED."value"
    ELSE "SiteConfig"."value"
  END,
  "label" = EXCLUDED."label",
  "updatedAt" = NOW();

COMMIT;
