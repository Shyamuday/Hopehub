-- Replace only the retired public bot link in saved welcome-button configurations.
-- Existing administrator changes are preserved; every other button stays untouched.
UPDATE "SiteConfig"
SET "value" = REPLACE("value", 'https://t.me/Hopehubbot', 'https://t.me/Hopehubwebbot'),
    "updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpWelcomeButtons'
  AND "value" LIKE '%https://t.me/Hopehubbot%';
