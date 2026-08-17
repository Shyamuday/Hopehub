-- Insert the safe, operational Group Help defaults only when a setting has no
-- stored value. Existing admin choices are never overwritten.
INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt") VALUES
  ('telegramLiveChatBridgeEnabled', 'Enabled', 'Website live-chat bridge', NOW()),
  ('telegramCommunityWelcomeEnabled', 'Enabled', 'Welcome new group members', NOW()),
  ('telegramCommunitySmartScheduleEnabled', 'Enabled', 'Smart community schedule', NOW()),
  ('telegramCommunityConfessionsInGroup', 'Enabled', 'Publish approved confessions in group', NOW()),
  ('telegramGroupHelpCaptchaMode', 'on', 'Captcha mode', NOW()),
  ('telegramGroupHelpWelcomeCleanup', 'on', 'Remove previous welcome message', NOW()),
  ('telegramGroupHelpJoinProtection', 'captcha', 'Join protection', NOW()),
  ('telegramGroupHelpAntiFloodAction', 'mute', 'Anti-flood action', NOW()),
  ('telegramGroupHelpAntiFloodLimit', '5 2', 'Anti-flood threshold', NOW()),
  ('telegramGroupHelpAntiSpamAction', 'warn', 'Anti-spam action', NOW()),
  ('telegramGroupHelpAntiPornAction', 'delete', 'NSFW protection', NOW()),
  ('telegramGroupHelpChannelSenderPolicy', 'delete', 'Messages sent as channels', NOW()),
  ('telegramGroupHelpReportsMode', 'admins', 'Member reports', NOW()),
  ('telegramGroupHelpStatisticsMode', 'admins only', 'Activity statistics', NOW()),
  ('telegramGroupHelpBackupRequest', 'enabled', 'Settings backup', NOW()),
  ('telegramGroupHelpReloadRequest', 'enabled', 'Administrator refresh', NOW())
ON CONFLICT ("key") DO NOTHING;
