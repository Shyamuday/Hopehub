BEGIN;

-- The Chit-Chat community must not inherit the primary group's navigation.
-- Give existing off-topic policy records a member-focused welcome keyboard.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = jsonb_set(
  policy."settings"::jsonb,
  '{telegramGroupHelpWelcomeButtons}',
  to_jsonb(
    E'Talk privately | https://hopehub.in/#live-connect | success && Share anonymously | https://t.me/Hopehubconfessionbot | success\nGroup rules | https://t.me/HHrules | success && HopeHub website | https://hopehub.in/ | success'::text
  ),
  true
),
"updatedAt" = NOW()
WHERE policy."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
);

COMMIT;
