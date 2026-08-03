UPDATE "HopeHubOffering"
SET
  "discountEnabled" = true,
  "discountType" = 'PERCENT',
  "discountLabel" = 'First session 50% off',
  "discountPercent" = 50,
  "discountFlatInPaise" = NULL,
  "discountMaxInPaise" = NULL,
  "compareAtPriceInPaise" = COALESCE("compareAtPriceInPaise", 50000),
  "subtitle" = '30-minute private session with a 15-minute follow-up included. Now 50% off.',
  "benefits" = ARRAY[
    '30-minute private session',
    'Additional 15-minute follow-up session included',
    '50% off your first support session',
    'Online audio by default',
    'Simple next-step guidance'
  ],
  "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
    'followUpSessionIncluded', true,
    'followUpSessionDurationMinutes', 15,
    'highlightOffer', true,
    'highlightOfferText', 'Book today at 50% off'
  ),
  "updatedAt" = NOW()
WHERE "code" = 'SINGLE_30';
