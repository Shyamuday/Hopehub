BEGIN;

-- SangMata requests have their own admin-only gate. Keeping these tokens in
-- the general banned-word list incorrectly warned or muted members before the
-- command-specific handler could provide its permission response.
UPDATE "SiteConfig"
SET "value" = COALESCE(
  (
    SELECT string_agg(trim(entry), E'\n')
    FROM regexp_split_to_table("value", E'[\r\n]+') AS entry
    WHERE lower(trim(entry)) NOT IN ('@sangmata_bot', 'allhistory')
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
          E'[\r\n]+'
        ) AS entry
        WHERE lower(trim(entry)) NOT IN ('@sangmata_bot', 'allhistory')
          AND trim(entry) <> ''
      ),
      ''
    )
  ),
  false
),
"updatedAt" = NOW()
WHERE "settings"::jsonb ? 'telegramGroupHelpBannedWords';

UPDATE "SiteConfig"
SET "value" = jsonb_set(
  "value"::jsonb,
  '{value}',
  to_jsonb(
    COALESCE(
      (
        SELECT string_agg(trim(entry), E'\n')
        FROM regexp_split_to_table(COALESCE("value"::jsonb->>'value', ''), E'[\r\n]+') AS entry
        WHERE lower(trim(entry)) NOT IN ('@sangmata_bot', 'allhistory')
          AND trim(entry) <> ''
      ),
      ''
    )
  )
)::text
WHERE "key" = '__system:group-help-default:telegramGroupHelpBannedWords'
  AND "value"::jsonb ? 'value';

COMMIT;
