BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt")
VALUES (
  'telegramGroupHelpAdminMentionImageUrl',
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/moderation/hopehub-admin-request-guide.jpeg',
  'Administrator request alert image',
  NOW()
)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
