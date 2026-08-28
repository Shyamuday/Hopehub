BEGIN;

-- Chit-Chat is the relaxed community: allow ordinary media and forwards while
-- retaining anti-NSFW, harassment, scam and flood protections.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = policy."settings"::jsonb || jsonb_build_object(
  'telegramGroupHelpWelcomeMessage', E'Hi {mention} 👋\n\nWelcome to *HopeHub Chit-Chat* — a relaxed place to talk and have fun.\n\nYou can share everyday updates, hobbies, jokes, memes, photos, videos, GIFs, stickers, music and voice notes.\n\nJust keep it friendly:\n• Be kind and respect people’s privacy.\n• No adult/graphic content, bullying, hate, scams or repeated spam.\n• Ask before sending someone a private message.\n• Use /report if something feels unsafe.\n\nFor private emotional support, use HopeHub Live through the button below.',
  'telegramGroupHelpRulesMessage', E'*HopeHub Chit-Chat — simple rules*\n\n1. Be kind. No bullying, hate, threats or harassment.\n2. Photos, videos, GIFs, stickers, music, documents and voice notes are welcome.\n3. Keep media safe: no adult, graphic, illegal or privacy-breaking content.\n4. No scams, repeated spam or unwanted promotion.\n5. Ask before privately messaging another member.\n6. Reply with /report when moderator help is needed.\n\nThat’s it — relax, talk and enjoy the community.',
  'telegramGroupHelpPinnedMessage', E'*Welcome to HopeHub Chit-Chat*\n\nChat freely and share safe photos, videos, GIFs, stickers, music and voice notes. Be kind, avoid unwanted DMs and use /report if something feels unsafe.\n\nPrivate support: https://hopehub.in/#live-connect',
  'telegramGroupHelpMediaPolicy', 'allow',
  'telegramGroupHelpAllowedMedia', E'photo\nvideo\naudio\nvoice\nGIF\nsticker\ndocument\npoll',
  'telegramGroupHelpForwardPolicy', 'allow',
  'telegramGroupHelpQuotePolicy', 'allow'
),
"updatedAt" = NOW()
WHERE policy."chatId" = (
  SELECT TRIM(config."value")
  FROM "SiteConfig" AS config
  WHERE config."key" = 'telegramGroupHelpOffTopicGroupChatId'
  LIMIT 1
);

COMMIT;
