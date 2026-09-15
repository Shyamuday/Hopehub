BEGIN;

-- Ordinary discussion about direct messages must not trigger automatic
-- deletion, warnings, or an eventual mute. Preserve phone-number and other
-- safety rules while removing DM/message aliases from global configuration.
WITH filtered AS (
  SELECT
    config.key,
    COALESCE(string_agg(line.value, E'\n' ORDER BY line.ordinality), '') AS value
  FROM "SiteConfig" AS config
  CROSS JOIN LATERAL regexp_split_to_table(config.value, E'\r?\n')
    WITH ORDINALITY AS line(value, ordinality)
  WHERE config.key IN ('telegramGroupHelpBannedWords', 'telegramGroupHelpReviewPhrases')
    AND btrim(line.value) !~* '(^|[^[:alnum:]])(dm|d[[:space:]]+m|pm|pv|msg|message|text|ping|private)([^[:alnum:]]|$)'
  GROUP BY config.key
)
UPDATE "SiteConfig" AS config
SET value = filtered.value,
    "updatedAt" = NOW()
FROM filtered
WHERE config.key = filtered.key;

-- Per-group settings override SiteConfig, so clean both policy lists too.
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET settings = jsonb_set(
      policy.settings::jsonb,
      '{telegramGroupHelpBannedWords}',
      to_jsonb(COALESCE((
        SELECT string_agg(line.value, E'\n' ORDER BY line.ordinality)
        FROM regexp_split_to_table(
          policy.settings->>'telegramGroupHelpBannedWords',
          E'\r?\n'
        ) WITH ORDINALITY AS line(value, ordinality)
        WHERE btrim(line.value) !~* '(^|[^[:alnum:]])(dm|d[[:space:]]+m|pm|pv|msg|message|text|ping|private)([^[:alnum:]]|$)'
      ), '')),
      false
    ),
    "updatedAt" = NOW()
WHERE policy.settings ? 'telegramGroupHelpBannedWords';

UPDATE "TelegramCommunityGroupPolicy" AS policy
SET settings = jsonb_set(
      policy.settings::jsonb,
      '{telegramGroupHelpReviewPhrases}',
      to_jsonb(COALESCE((
        SELECT string_agg(line.value, E'\n' ORDER BY line.ordinality)
        FROM regexp_split_to_table(
          policy.settings->>'telegramGroupHelpReviewPhrases',
          E'\r?\n'
        ) WITH ORDINALITY AS line(value, ordinality)
        WHERE btrim(line.value) !~* '(^|[^[:alnum:]])(dm|d[[:space:]]+m|pm|pv|msg|message|text|ping|private)([^[:alnum:]]|$)'
      ), '')),
      false
    ),
    "updatedAt" = NOW()
WHERE policy.settings ? 'telegramGroupHelpReviewPhrases';

COMMIT;
