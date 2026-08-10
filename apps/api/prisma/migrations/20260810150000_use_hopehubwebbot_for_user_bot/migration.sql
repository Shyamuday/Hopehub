UPDATE "SiteConfig"
SET "value" = 'Hopehubwebbot',
    "description" = 'Telegram user/support web bot username',
    "updatedAt" = NOW()
WHERE "key" = 'telegramUserBotUsername'
  AND ("value" IS NULL OR "value" = '' OR LOWER("value") = 'hopehubbot');
