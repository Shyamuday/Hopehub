BEGIN;

-- Per-group settings intentionally override the global SiteConfig. Older
-- snapshots predate the built-in wellbeing filters. Restore every required
-- system filter by stable ID without copying unrelated global filters.
WITH required_filter AS (
  SELECT
    line,
    substring(line FROM '"id":"([^"]+)"') AS filter_id
  FROM "SiteConfig"
  CROSS JOIN LATERAL regexp_split_to_table("value", E'\\r?\\n') AS line
  WHERE
    "key" = 'telegramGroupHelpCustomReplies'
    AND substring(line FROM '"id":"([^"]+)"') IN (
      'hopehub-immediate-support-v1',
      'hopehub-anxiety-support-v1',
      'hopehub-low-mood-support-v1',
      'hopehub-loneliness-support-v1'
    )
),
missing_by_policy AS (
  SELECT
    policy."id" AS policy_id,
    string_agg(required_filter.line, E'\n' ORDER BY required_filter.filter_id) AS definitions
  FROM "TelegramCommunityGroupPolicy" AS policy
  CROSS JOIN required_filter
  WHERE
    policy."settings" ? 'telegramGroupHelpCustomReplies'
    AND POSITION(
      CONCAT('"id":"', required_filter.filter_id, '"')
      IN COALESCE(policy."settings"->>'telegramGroupHelpCustomReplies', '')
    ) = 0
  GROUP BY policy."id"
)
UPDATE "TelegramCommunityGroupPolicy" AS policy
SET
  "settings" = jsonb_set(
    policy."settings",
    '{telegramGroupHelpCustomReplies}',
    to_jsonb(
      CONCAT_WS(
        E'\n',
        NULLIF(BTRIM(policy."settings"->>'telegramGroupHelpCustomReplies'), ''),
        missing_by_policy.definitions
      )
    ),
    true
  ),
  "updatedAt" = NOW()
FROM missing_by_policy
WHERE policy."id" = missing_by_policy.policy_id;

COMMIT;
