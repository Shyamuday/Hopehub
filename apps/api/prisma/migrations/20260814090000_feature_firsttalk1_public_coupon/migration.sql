UPDATE "RewardProgramRule"
SET
  "conditions" = COALESCE("conditions", '{}'::jsonb) || jsonb_build_object(
    'showToConsumers', true,
    'featured', true,
    'publicLabel', 'Talk to a listener for ₹1',
    'publicDescription', 'Apply this offer to an eligible listener session.'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "promoCode" = 'FIRSTTALK1';
