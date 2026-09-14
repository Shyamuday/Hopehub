BEGIN;

-- Keep transient Group Help bot replies visible long enough to read without
-- allowing command and moderation notices to clutter the community.
UPDATE "SiteConfig"
SET "value" = '60', "updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpAutoDeleteSeconds'
  AND ("value" IS NULL OR BTRIM("value") IN ('', '0', '300'));

COMMIT;
