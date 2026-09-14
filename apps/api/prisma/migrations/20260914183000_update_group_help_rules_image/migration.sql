BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "createdAt", "updatedAt")
VALUES (
  'telegramGroupHelpRulesImageUrl',
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/moderation/hopehub-community-rules-v2.png',
  'Rules media URL',
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "label" = EXCLUDED."label",
    "updatedAt" = NOW()
WHERE COALESCE(TRIM("SiteConfig"."value"), '') = ''
   OR "SiteConfig"."value" = 'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/moderation/hopehub-admin-request-guide.jpeg';

COMMIT;
