BEGIN;

-- "Service" is ordinary community language and is too broad to trigger a
-- warning by itself. Remove only the exact standalone entry; retain specific
-- phrases such as "escort service" and "sexy service".
UPDATE "SiteConfig"
SET "value" = COALESCE(
  (
    SELECT string_agg(entry, E'\n' ORDER BY ordinality)
    FROM regexp_split_to_table("value", E'\r?\n') WITH ORDINALITY AS line(entry, ordinality)
    WHERE lower(trim(entry)) <> 'service'
      AND trim(entry) <> ''
  ),
  ''
),
"updatedAt" = NOW()
WHERE "key" IN ('telegramGroupHelpBannedWords', 'telegramGroupHelpReviewPhrases');

UPDATE "TelegramCommunityGroupPolicy" AS policy
SET "settings" = jsonb_set(
  policy."settings"::jsonb,
  '{telegramGroupHelpBannedWords}',
  to_jsonb(
    COALESCE(
      (
        SELECT string_agg(entry, E'\n' ORDER BY ordinality)
        FROM regexp_split_to_table(
          COALESCE(policy."settings"->>'telegramGroupHelpBannedWords', ''),
          E'\r?\n'
        ) WITH ORDINALITY AS line(entry, ordinality)
        WHERE lower(trim(entry)) <> 'service'
          AND trim(entry) <> ''
      ),
      ''
    )
  ),
  false
),
"updatedAt" = NOW()
WHERE policy."settings"::jsonb ? 'telegramGroupHelpBannedWords';

-- Keep the legacy managed-default payload clean for audits and admin tooling.
UPDATE "SiteConfig"
SET "value" = jsonb_set(
  "value"::jsonb,
  '{value}',
  to_jsonb(
    COALESCE(
      (
        SELECT string_agg(entry, E'\n' ORDER BY ordinality)
        FROM regexp_split_to_table(COALESCE("value"::jsonb->>'value', ''), E'\r?\n')
          WITH ORDINALITY AS line(entry, ordinality)
        WHERE lower(trim(entry)) <> 'service'
          AND trim(entry) <> ''
      ),
      ''
    )
  )
)::text,
"updatedAt" = NOW()
WHERE "key" = '__system:group-help-default:telegramGroupHelpBannedWords'
  AND "value"::jsonb ? 'value';

COMMIT;
