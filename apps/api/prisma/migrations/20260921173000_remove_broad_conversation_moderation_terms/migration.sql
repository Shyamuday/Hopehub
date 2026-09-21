BEGIN;

-- Ordinary conversation and mild colloquial words must not cause automatic
-- deletion or warnings. Keep specific explicit phrases such as "hot chat",
-- "sex chat", and "escort service" intact.
CREATE TEMP TABLE "BroadConversationModerationTerm" ("value" TEXT PRIMARY KEY) ON COMMIT DROP;

INSERT INTO "BroadConversationModerationTerm" ("value") VALUES
  ('service'),
  ('shayari'),
  ('noob'),
  ('dumb'),
  ('stupid'),
  ('pagal'),
  ('anyone available for chat'),
  ('anyone to chat?'),
  ('anyone to chatting'),
  ('anyone up for chat'),
  ('anyone up for chat?'),
  ('anyone wants to chat on random topic'),
  ('can we chat?'),
  ('chat anyone'),
  ('chat anyone?'),
  ('chatting?'),
  ('let''s chat'),
  ('someone for chat'),
  ('up for chat?');

UPDATE "SiteConfig"
SET "value" = COALESCE(
  (
    SELECT string_agg(entry, E'\n' ORDER BY ordinality)
    FROM regexp_split_to_table("value", E'\r?\n') WITH ORDINALITY AS line(entry, ordinality)
    WHERE lower(trim(entry)) NOT IN (SELECT "value" FROM "BroadConversationModerationTerm")
      AND trim(entry) <> ''
  ),
  ''
),
"updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpBannedWords';

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
        WHERE lower(trim(entry)) NOT IN (SELECT "value" FROM "BroadConversationModerationTerm")
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
        WHERE lower(trim(entry)) NOT IN (SELECT "value" FROM "BroadConversationModerationTerm")
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
