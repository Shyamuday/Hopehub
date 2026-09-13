BEGIN;

-- "Pagal" and its ordinary conversational variants are too broad for
-- automatic moderation. Remove exact entries without weakening other rules.
UPDATE "SiteConfig"
SET "value" = COALESCE(
  (
    SELECT string_agg(trim(entry), E'\n')
    FROM regexp_split_to_table("value", E'[\r\n]+') AS entry
    WHERE lower(trim(entry)) NOT IN (
      'pagal',
      'pagla',
      'pagalpan (context)',
      'pagalpan (insulting use)'
    )
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
        WHERE lower(trim(entry)) NOT IN (
          'pagal',
          'pagla',
          'pagalpan (context)',
          'pagalpan (insulting use)'
        )
          AND trim(entry) <> ''
      ),
      ''
    )
  ),
  false
),
"updatedAt" = NOW()
WHERE "settings"::jsonb ? 'telegramGroupHelpBannedWords';

-- Clean the obsolete override payload as well, so audits and admin tooling do
-- not continue displaying words that are no longer active.
UPDATE "SiteConfig"
SET "value" = jsonb_set(
  "value"::jsonb,
  '{value}',
  to_jsonb(
    COALESCE(
      (
        SELECT string_agg(trim(entry), E'\n')
        FROM regexp_split_to_table(COALESCE("value"::jsonb->>'value', ''), E'[\r\n]+') AS entry
        WHERE lower(trim(entry)) NOT IN (
          'pagal',
          'pagla',
          'pagalpan (context)',
          'pagalpan (insulting use)'
        )
          AND trim(entry) <> ''
      ),
      ''
    )
  )
)::text
WHERE "key" = '__system:group-help-default:telegramGroupHelpBannedWords'
  AND "value"::jsonb ? 'value';

COMMIT;
