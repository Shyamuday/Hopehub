BEGIN;

-- The former preview group is now a permanent, independently managed
-- HopeHub Chit-Chat community. Preserve the existing chat ID.
INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES (
  'telegramGroupHelpOffTopicGroupChatId',
  COALESCE(
    NULLIF((SELECT TRIM("value") FROM "SiteConfig" WHERE "key" = 'telegramGroupHelpOffTopicGroupChatId'), ''),
    NULLIF((SELECT TRIM("value") FROM "SiteConfig" WHERE "key" = 'telegramGroupHelpTestGroupChatId'), ''),
    '@hopehubtalks'
  ),
  'Off-topic Telegram group ID',
  NOW()
)
ON CONFLICT ("key") DO UPDATE
SET "value" = COALESCE(
  NULLIF((SELECT TRIM("value") FROM "SiteConfig" WHERE "key" = 'telegramGroupHelpTestGroupChatId'), ''),
  NULLIF(TRIM("SiteConfig"."value"), ''),
  EXCLUDED."value"
),
"label" = EXCLUDED."label",
"updatedAt" = NOW();

DELETE FROM "SiteConfig"
WHERE "key" = 'telegramGroupHelpTestGroupChatId';

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES
  (
    'telegramGroupHelpMainGroupUrl',
    'https://t.me/hopehubindia',
    'Main support group public link',
    NOW()
  ),
  (
    'telegramGroupHelpOffTopicGroupUrl',
    'https://t.me/hopehubtalks',
    'Chit-Chat group public link',
    NOW()
  )
ON CONFLICT ("key") DO NOTHING;

-- Seed only the values that should differ from the primary support group.
-- Existing per-group administrator changes win over these initial defaults.
INSERT INTO "TelegramCommunityGroupPolicy" (
  "id",
  "chatId",
  "settings",
  "createdAt",
  "updatedAt"
)
SELECT
  'offtopic-' || SUBSTRING(MD5("value") FROM 1 FOR 24),
  "value",
  jsonb_build_object(
    'telegramGroupHelpGroupTitle', 'HopeHub Chit-Chat',
    'telegramGroupHelpWelcomeMessage', E'Hi {mention} 👋\n\nWelcome to *HopeHub Chit-Chat* — Hope Hub’s relaxed, off-topic community space.\n\nUse this group for friendly conversations, everyday updates, hobbies, humour and healthy connection. You can speak freely, but please protect your privacy and be considerate of people who may be having a difficult day.\n\n• Be respectful and inclusive.\n• Do not send unwanted private messages.\n• No harassment, sexual content, hate, scams, spam or promotions.\n• Do not present yourself as a therapist or offer unsafe medical advice.\n• Report concerning behaviour to the admins.\n\nFor private emotional support, use HopeHub Live through the button below.',
    'telegramGroupHelpAboutMessage', E'*About HopeHub Chit-Chat*\n\nThis is Hope Hub’s community room for friendly, informal and off-topic conversation.\n\nYou can use it to:\n• Meet and talk with community members.\n• Share everyday moments, interests and positive updates.\n• Join light conversations without turning every discussion into a support session.\n• Find the official Hope Hub routes when you need a listener or professional care.\n\nThis group is managed by the Hope Hub bot for safety. It is not therapy, medical care or an emergency service.',
    'telegramGroupHelpRulesMessage', E'*HopeHub Chit-Chat rules*\n\n1. Treat every member with respect.\n2. Protect privacy; do not repost messages or personal information.\n3. No bullying, hate, sexual content, threats or harassment.\n4. No spam, scams, unsolicited promotions or repeated links.\n5. Do not send unwanted private messages or pressure people to talk privately.\n6. Do not impersonate professionals or give unsafe medical advice.\n7. Use /report on a message when moderator help is needed.\n8. For urgent danger, contact local emergency services; this group is not emergency care.',
    'telegramGroupHelpSupportMessage', 'For private emotional support, visit https://hopehub.in/#live-connect. You can choose chat, voice or video based on provider availability. This group is not an emergency service.',
    'telegramGroupHelpPinnedMessage', E'*Welcome to HopeHub Chit-Chat*\n\nFriendly off-topic conversation is welcome here. Keep it respectful, protect privacy, avoid unsolicited DMs and use /report if something feels unsafe.\n\nPrivate support: https://hopehub.in/#live-connect',
    'telegramGroupHelpRecurringMessage', 'Community reminder: keep conversations respectful, protect personal details, avoid unsolicited DMs and report unsafe behaviour to the admins.',
    'telegramGroupHelpJoinProtection', 'captcha',
    'telegramGroupHelpCaptchaMode', 'on',
    'telegramGroupHelpJoinLeaveMessages', 'join only',
    'telegramGroupHelpWelcomeCleanup', 'on',
    'telegramGroupHelpFirstMessageReview', 'off',
    'telegramGroupHelpNewMemberAction', 'staff review',
    'telegramGroupHelpAntiFloodAction', 'mute',
    'telegramGroupHelpAntiFloodLimit', '5 2',
    'telegramGroupHelpAntiSpamAction', 'warn',
    'telegramGroupHelpAntiPornAction', 'review',
    'telegramGroupHelpLinkPolicy', 'warn',
    'telegramGroupHelpMediaPolicy', 'allow',
    'telegramGroupHelpForwardPolicy', 'warn',
    'telegramGroupHelpChannelSenderPolicy', 'delete',
    'telegramGroupHelpReportsMode', 'staff group',
    'telegramGroupHelpIdentityChangeAlerts', 'staff only',
    'telegramGroupHelpNightMode', 'off',
    'telegramGroupHelpStatisticsMode', 'admins only',
    'telegramGroupHelpTimezone', 'Asia/Kolkata'
  ),
  NOW(),
  NOW()
FROM "SiteConfig"
WHERE "key" = 'telegramGroupHelpOffTopicGroupChatId'
  AND TRIM("value") <> ''
ON CONFLICT ("chatId") DO UPDATE
SET "settings" = EXCLUDED."settings" || "TelegramCommunityGroupPolicy"."settings",
    "updatedAt" = NOW();

COMMIT;
