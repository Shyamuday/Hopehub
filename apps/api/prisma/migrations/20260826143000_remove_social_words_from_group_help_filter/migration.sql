BEGIN;

-- Facebook and Insta are ordinary platform names, not automatic safety violations.
-- Remove exact entries from both the global Group Help config and per-group overrides.
UPDATE "SiteConfig"
SET "value" = COALESCE(
  (
    SELECT string_agg(trim(entry), E'\n')
    FROM regexp_split_to_table("value", E'[,\r\n]+') AS entry
    WHERE lower(trim(entry)) NOT IN ('facebook', 'insta')
      AND trim(entry) <> ''
  ),
  ''
)
WHERE "key" = 'telegramGroupHelpBannedWords';

UPDATE "TelegramCommunityGroupPolicy"
SET "settings" = jsonb_set(
  "settings"::jsonb,
  '{telegramGroupHelpBannedWords}',
  to_jsonb(
    COALESCE(
      (
        SELECT string_agg(trim(entry), E'\n')
        FROM regexp_split_to_table(
          COALESCE("settings"->>'telegramGroupHelpBannedWords', ''),
          E'[,\r\n]+'
        ) AS entry
        WHERE lower(trim(entry)) NOT IN ('facebook', 'insta')
          AND trim(entry) <> ''
      ),
      ''
    )
  ),
  false
)
WHERE "settings"::jsonb ? 'telegramGroupHelpBannedWords';

COMMIT;
