INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt") VALUES
  ('telegramGroupHelpWelcomeImageUrl', '', 'Welcome image URL', NOW()),
  ('telegramGroupHelpRulesImageUrl', '', 'Rules image URL', NOW()),
  ('telegramGroupHelpSupportImageUrl', '', 'Support image URL', NOW()),
  ('telegramGroupHelpPinnedImageUrl', '', 'Pinned intro image URL', NOW()),
  ('telegramGroupHelpRecurringImageUrl', '', 'Recurring reminder image URL', NOW())
ON CONFLICT ("key") DO NOTHING;
