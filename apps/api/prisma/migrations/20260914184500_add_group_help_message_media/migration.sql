BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "createdAt", "updatedAt")
VALUES
  (
    'telegramGroupHelpSupportImageUrl',
    'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/community/hopehub-support-v1.png',
    'Support media URL',
    NOW(),
    NOW()
  ),
  (
    'telegramGroupHelpPinnedImageUrl',
    'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/community/hopehub-pinned-intro-v1.png',
    'Pinned intro media URL',
    NOW(),
    NOW()
  ),
  (
    'telegramGroupHelpAdminRecruitmentImageUrl',
    'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/community/hopehub-admin-recruitment-v1.png',
    'Telegram admin recruitment media URL',
    NOW(),
    NOW()
  ),
  (
    'telegramGroupHelpRecurringImageUrl',
    'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/community/hopehub-community-reminder-v1.png',
    'Recurring reminder media URL',
    NOW(),
    NOW()
  )
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "label" = EXCLUDED."label",
    "updatedAt" = NOW()
WHERE COALESCE(TRIM("SiteConfig"."value"), '') = '';

COMMIT;
