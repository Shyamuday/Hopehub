BEGIN;

-- Carry the public group rename into existing installations without rewriting
-- applied migrations, numeric chat IDs, delivery records or campaign identifiers.
UPDATE "SiteConfig"
SET "value" = regexp_replace(
  regexp_replace("value", 'hopehubtalks', 'AnxietyDepressionlonelyindia', 'gi'),
  'HopeHub Chit-Chat|Hopehub Talks', 'chatfrendshiplovevc', 'gi'
), "updatedAt" = NOW()
WHERE "value" ~* 'hopehubtalks|HopeHub Chit-Chat|Hopehub Talks';

UPDATE "TelegramCommunityGroupPolicy"
SET "settings" = regexp_replace(
  regexp_replace("settings"::text, 'hopehubtalks', 'AnxietyDepressionlonelyindia', 'gi'),
  'HopeHub Chit-Chat|Hopehub Talks', 'chatfrendshiplovevc', 'gi'
)::jsonb, "updatedAt" = NOW()
WHERE "settings"::text ~* 'hopehubtalks|HopeHub Chit-Chat|Hopehub Talks';

COMMIT;
