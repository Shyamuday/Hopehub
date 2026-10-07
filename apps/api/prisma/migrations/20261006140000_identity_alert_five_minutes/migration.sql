BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES ('telegramGroupHelpIdentityAlertDeleteMinutes', '5', 'Profile-change alert expiry (minutes)', NOW())
ON CONFLICT ("key") DO NOTHING;

COMMIT;
