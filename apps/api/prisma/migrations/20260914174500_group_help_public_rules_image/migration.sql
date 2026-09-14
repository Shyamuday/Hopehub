BEGIN;

UPDATE "SiteConfig"
SET "value" = 'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/moderation/hopehub-admin-request-guide.jpeg',
    "updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpRulesImageUrl'
  AND COALESCE(TRIM("value"), '') = '';

COMMIT;
