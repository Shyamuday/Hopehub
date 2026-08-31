BEGIN;

-- Chit-Chat has an independent, conversation-friendly filter. The primary
-- support group's global and per-group phrase lists are intentionally intact.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = policy."settings"::jsonb || jsonb_build_object(
  'telegramGroupHelpBannedWords', E'teri maa ki chut\nteri behen ki chut\nfuck you\ni want pussy\ni want sex\nsex video\nxxx video\nporn video\npornstar\nxvideos\nxnxx\nxhamster\ncallgirl\ncall girl\nescort service\nhot girl available\nnude video\nnudes available\nsexy service\nvideo call sex\nsend nudes',
  'telegramGroupHelpReviewPhrases', E'send me your number\nshare your number\ndm me your number\nmsg me your number\nwhatsapp me privately'
),
"updatedAt" = NOW()
WHERE policy."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
);

COMMIT;
