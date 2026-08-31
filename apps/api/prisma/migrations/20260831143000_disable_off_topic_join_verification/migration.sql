BEGIN;

-- HopeHub Chit-Chat is a low-friction community. New members should receive
-- its welcome message immediately without being restricted, challenged with a
-- captcha, or asked to tap a verification button. The primary support group's
-- independent policy is intentionally untouched.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = policy."settings"::jsonb || jsonb_build_object(
  'telegramGroupHelpJoinProtection', 'off',
  'telegramGroupHelpCaptchaMode', 'off',
  'telegramGroupHelpFirstMessageReview', 'off'
),
"updatedAt" = NOW()
WHERE policy."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
);

COMMIT;
