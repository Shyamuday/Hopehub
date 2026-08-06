UPDATE "SiteConfig"
SET "value" = 'Hopehubbot',
    "updatedAt" = NOW()
WHERE "key" = 'telegramUserBotUsername'
  AND ("value" IS NULL OR "value" = '' OR "value" = 'Hopehubwebbot');
