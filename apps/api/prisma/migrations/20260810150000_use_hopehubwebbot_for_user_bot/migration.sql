UPDATE "SiteConfig"
SET "value" = 'Hopehubwebbot',
    "updatedAt" = NOW()
WHERE "key" = 'telegramUserBotUsername'
  AND ("value" IS NULL OR "value" = '' OR LOWER("value") = 'hopehubbot');
