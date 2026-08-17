-- HopeHubAI is retired from the community runtime. Keep the internal route slug
-- stable so existing campaigns, deliveries, and moderation history remain intact.
UPDATE "SiteConfig"
SET "value" = 'Hopehubbot',
    "updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpBotUsername'
  AND LOWER(COALESCE("value", '')) IN ('hopehubaibot', 'hopehubbot');

UPDATE "SiteConfig"
SET "value" = 'Hope Hub bot',
    "updatedAt" = NOW()
WHERE "key" = 'telegramGroupModerationRuntime'
  AND "value" = 'HopeHubAI';
