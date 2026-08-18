-- WELCOME100 is the consumer-facing default for chat, voice, and video.
-- FIRSTTALK1 remains valid when entered manually, but is no longer advertised.
UPDATE "RewardProgramRule"
SET
  "name" = 'Welcome 100% live-service access',
  "description" = 'Reusable 100% coupon for all Hope Hub live chat, voice, and video services.',
  "valueType" = 'CHECKOUT_DISCOUNT_PERCENT',
  "valueAmount" = 10000,
  "appliesTo" = 'CONSULTATION',
  "promoCode" = 'WELCOME100',
  "maxUsesPerPatient" = NULL,
  "maxUsesGlobal" = NULL,
  "maxDiscountInPaise" = NULL,
  "minOrderInPaise" = NULL,
  "minPayableInPaise" = 0,
  "isActive" = true,
  "priority" = 1000,
  "conditions" = '{"targetPayableInPaise":0,"showToConsumers":true,"featured":true,"publicLabel":"Welcome100 — your first connection is free","publicDescription":"Use this welcome coupon for a free Hope Hub chat, voice, or video session."}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'WELCOME100_ALL_LIVE_SERVICES';

UPDATE "RewardProgramRule"
SET
  "conditions" = COALESCE("conditions", '{}'::jsonb) || '{"showToConsumers":false,"featured":false}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'FIRSTTALK1_LISTENER_OFFER';
