BEGIN;

UPDATE "SiteConfig"
SET "value" = REPLACE(
  "value",
  'https://hopehub.in/careers',
  'https://hopehub.in/careers/tgadmin'
)
WHERE "key" = 'telegramGroupHelpAdminRecruitmentMessage'
  AND "value" LIKE '%https://hopehub.in/careers%'
  AND "value" NOT LIKE '%https://hopehub.in/careers/tgadmin%';

COMMIT;
