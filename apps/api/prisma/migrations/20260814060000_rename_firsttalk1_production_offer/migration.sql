UPDATE "RewardProgramRule"
SET
  "code" = 'FIRSTTALK1_LISTENER_OFFER',
  "name" = 'First Talk ₹1 listener offer',
  "description" = 'Promotional coupon for eligible listener support sessions at ₹1.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'FIRSTTALK1_LISTENER_TEST';
