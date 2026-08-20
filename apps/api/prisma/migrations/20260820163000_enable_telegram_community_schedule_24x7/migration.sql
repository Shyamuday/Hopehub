-- Hope Hub community campaigns now run throughout the day. Equal start/end
-- values are interpreted by the scheduler as a 24-hour posting window.
INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt") VALUES
  ('telegramCommunityScheduleStart', '00:00', 'Community posts start', NOW()),
  ('telegramCommunityScheduleEnd', '00:00', 'Community posts end', NOW())
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "label" = EXCLUDED."label",
  "updatedAt" = NOW();
