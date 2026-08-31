BEGIN;

-- Chit-Chat is the relaxed community and permits ordinary links. Scam,
-- harassment, flood and explicitly blocked-phrase moderation remain active.
-- The primary support group's independent link policy is untouched.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = policy."settings"::jsonb || jsonb_build_object(
  'telegramGroupHelpLinkPolicy', 'allow'
),
"updatedAt" = NOW()
WHERE policy."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
);

COMMIT;
