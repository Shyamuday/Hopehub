BEGIN;

-- Rename the reusable welcome coupon without breaking existing redemption relationships.
DO $migration$
DECLARE
  legacy_rule_id TEXT;
  replacement_rule_id TEXT;
BEGIN
  SELECT "id"
  INTO legacy_rule_id
  FROM "RewardProgramRule"
  WHERE "code" = 'WELCOME100_ALL_LIVE_SERVICES' OR "promoCode" = 'WELCOME100'
  ORDER BY CASE WHEN "code" = 'WELCOME100_ALL_LIVE_SERVICES' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT "id"
  INTO replacement_rule_id
  FROM "RewardProgramRule"
  WHERE "code" = 'WELCOMEFREE_ALL_LIVE_SERVICES' OR "promoCode" = 'WELCOMEFREE'
  ORDER BY CASE WHEN "code" = 'WELCOMEFREE_ALL_LIVE_SERVICES' THEN 0 ELSE 1 END
  LIMIT 1;

  IF legacy_rule_id IS NOT NULL AND replacement_rule_id IS NOT NULL
     AND legacy_rule_id <> replacement_rule_id THEN
    UPDATE "RewardRedemption"
    SET "ruleId" = replacement_rule_id
    WHERE "ruleId" = legacy_rule_id;

    UPDATE "WalletLedgerEntry"
    SET "ruleId" = replacement_rule_id
    WHERE "ruleId" = legacy_rule_id;

    DELETE FROM "RewardProgramRule" WHERE "id" = legacy_rule_id;
  ELSIF legacy_rule_id IS NOT NULL THEN
    UPDATE "RewardProgramRule"
    SET
      "code" = 'WELCOMEFREE_ALL_LIVE_SERVICES',
      "promoCode" = 'WELCOMEFREE'
    WHERE "id" = legacy_rule_id;
  END IF;
END
$migration$;

UPDATE "RewardProgramRule"
SET
  "code" = 'WELCOMEFREE_ALL_LIVE_SERVICES',
  "name" = 'Welcome Free live-service access',
  "description" = 'Reusable 100% coupon for all Hope Hub live chat, voice, and video services.',
  "valueType" = 'CHECKOUT_DISCOUNT_PERCENT',
  "valueAmount" = 10000,
  "appliesTo" = 'CONSULTATION',
  "promoCode" = 'WELCOMEFREE',
  "maxUsesPerPatient" = NULL,
  "maxUsesGlobal" = NULL,
  "maxDiscountInPaise" = NULL,
  "minOrderInPaise" = NULL,
  "minPayableInPaise" = 0,
  "isActive" = true,
  "priority" = 1000,
  "conditions" = '{"targetPayableInPaise":0,"showToConsumers":true,"featured":true,"publicLabel":"WelcomeFree — your live connection is free","publicDescription":"Use this welcome coupon for a free Hope Hub chat, voice, or video session."}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'WELCOMEFREE_ALL_LIVE_SERVICES';

-- Remove the former name from stored checkout snapshots displayed in user/admin history.
UPDATE "Payment"
SET "appliedRules" = replace(
  replace(
    replace(
      replace("appliedRules"::text, 'WELCOME100_ALL_LIVE_SERVICES', 'WELCOMEFREE_ALL_LIVE_SERVICES'),
      'WELCOME100', 'WELCOMEFREE'
    ),
    'Welcome100', 'WelcomeFree'
  ),
  'Welcome 100% live-service access', 'Welcome Free live-service access'
)::jsonb
WHERE "appliedRules" IS NOT NULL AND "appliedRules"::text ILIKE '%welcome100%';

UPDATE "Payment"
SET "lineItems" = replace(
  replace(
    replace(
      replace("lineItems"::text, 'WELCOME100_ALL_LIVE_SERVICES', 'WELCOMEFREE_ALL_LIVE_SERVICES'),
      'WELCOME100', 'WELCOMEFREE'
    ),
    'Welcome100', 'WelcomeFree'
  ),
  'Welcome 100% live-service access', 'Welcome Free live-service access'
)::jsonb
WHERE "lineItems" IS NOT NULL AND "lineItems"::text ILIKE '%welcome100%';

UPDATE "Consultation"
SET "pricingSnapshot" = replace(
  replace(
    replace(
      replace("pricingSnapshot"::text, 'WELCOME100_ALL_LIVE_SERVICES', 'WELCOMEFREE_ALL_LIVE_SERVICES'),
      'WELCOME100', 'WELCOMEFREE'
    ),
    'Welcome100', 'WelcomeFree'
  ),
  'Welcome 100% live-service access', 'Welcome Free live-service access'
)::jsonb
WHERE "pricingSnapshot" IS NOT NULL AND "pricingSnapshot"::text ILIKE '%welcome100%';

UPDATE "RewardRedemption"
SET "context" = replace(
  replace(
    replace(
      replace("context"::text, 'WELCOME100_ALL_LIVE_SERVICES', 'WELCOMEFREE_ALL_LIVE_SERVICES'),
      'WELCOME100', 'WELCOMEFREE'
    ),
    'Welcome100', 'WelcomeFree'
  ),
  'Welcome 100% live-service access', 'Welcome Free live-service access'
)::jsonb
WHERE "context" IS NOT NULL AND "context"::text ILIKE '%welcome100%';

COMMIT;
