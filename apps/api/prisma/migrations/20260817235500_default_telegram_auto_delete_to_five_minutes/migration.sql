-- Use the existing Group Help automatic-deletion control for new and legacy
-- installations. A deliberate non-zero value remains untouched.
UPDATE "SiteConfig"
SET "value" = '300', "updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpAutoDeleteSeconds'
  AND ("value" IS NULL OR BTRIM("value") = '' OR BTRIM("value") = '0');
