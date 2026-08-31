BEGIN;

-- Telegram does not supply an NSFW verdict for incoming media. The previous
-- "review" setting consequently removed every photo, video, GIF, sticker and
-- file from Chit-Chat even though its media policy explicitly allowed them.
-- Keep the main support community's independent review policy unchanged.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = policy."settings"::jsonb || jsonb_build_object(
  'telegramGroupHelpAntiPornAction', 'off',
  'telegramGroupHelpMediaPolicy', 'allow',
  'telegramGroupHelpAllowedMedia', E'photo\nvideo\naudio\nvoice\nGIF\nsticker\ndocument\npoll'
),
"updatedAt" = NOW()
WHERE policy."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
);

-- These cases were generated only because every media message was blanket-
-- reviewed. Close them so the moderation inbox no longer shows false alerts.
UPDATE "TelegramCommunityModerationCase" AS moderation_case
SET "status" = 'CLOSED',
    "action" = 'POLICY_CORRECTED',
    "resolvedAt" = NOW(),
    "updatedAt" = NOW()
WHERE moderation_case."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
)
  AND moderation_case."reason" = 'MEDIA_REVIEW'
  AND moderation_case."status" = 'OPEN';

COMMIT;
