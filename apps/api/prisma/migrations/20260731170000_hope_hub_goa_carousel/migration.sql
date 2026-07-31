ALTER TABLE "HopeHubOffering"
  ADD COLUMN IF NOT EXISTS "discountStartsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "discountEndsAt" TIMESTAMP(3);

INSERT INTO "HopeHubOffering" (
  "id", "code", "slug", "title", "subtitle", "description", "type", "priceInPaise",
  "compareAtPriceInPaise", "discountEnabled", "discountType", "discountLabel", "discountCode",
  "discountPercent", "discountFlatInPaise", "discountMaxInPaise", "discountStartsAt",
  "discountEndsAt", "partialPaymentEnabled", "partialPaymentType", "partialPaymentLabel",
  "partialPaymentPercent", "partialPaymentFlatInPaise", "validityDays", "sessionCount",
  "sessionDurationMinutes", "deliveryMode", "ctaLabel", "routePath", "benefits", "audience",
  "isActive", "isFeatured", "requiresLeadForm", "sortOrder", "updatedAt"
) VALUES (
  'hope-offer-community-meetup',
  'COMMUNITY_MEETUP',
  'goa-wellness-meetup',
  'Goa wellness meetup',
  'A focused in-person wellness meetup in Goa.',
  'A premium guided wellness meetup in Goa with group reflection, practical emotional wellness tools, and next-step care planning.',
  'MEETUP',
  5100000,
  NULL,
  true,
  'PERCENT',
  'Goa meetup offer',
  NULL,
  40,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  'PERCENT',
  'Reserve with 40%',
  40,
  NULL,
  NULL,
  1,
  180,
  'OFFLINE',
  'Reserve seat',
  '/events/goa-wellness-meetup',
  ARRAY['In-person Goa meetup', 'Guided group wellness session', 'Care planning and follow-up direction'],
  ARRAY['Individuals', 'Working professionals', 'Wellness seekers'],
  true,
  true,
  false,
  21,
  NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "description" = EXCLUDED."description",
  "type" = EXCLUDED."type",
  "priceInPaise" = EXCLUDED."priceInPaise",
  "compareAtPriceInPaise" = EXCLUDED."compareAtPriceInPaise",
  "discountEnabled" = EXCLUDED."discountEnabled",
  "discountType" = EXCLUDED."discountType",
  "discountLabel" = EXCLUDED."discountLabel",
  "discountCode" = EXCLUDED."discountCode",
  "discountPercent" = EXCLUDED."discountPercent",
  "discountFlatInPaise" = EXCLUDED."discountFlatInPaise",
  "discountMaxInPaise" = EXCLUDED."discountMaxInPaise",
  "discountStartsAt" = EXCLUDED."discountStartsAt",
  "discountEndsAt" = EXCLUDED."discountEndsAt",
  "partialPaymentEnabled" = EXCLUDED."partialPaymentEnabled",
  "partialPaymentType" = EXCLUDED."partialPaymentType",
  "partialPaymentLabel" = EXCLUDED."partialPaymentLabel",
  "partialPaymentPercent" = EXCLUDED."partialPaymentPercent",
  "partialPaymentFlatInPaise" = EXCLUDED."partialPaymentFlatInPaise",
  "validityDays" = EXCLUDED."validityDays",
  "sessionCount" = EXCLUDED."sessionCount",
  "sessionDurationMinutes" = EXCLUDED."sessionDurationMinutes",
  "deliveryMode" = EXCLUDED."deliveryMode",
  "ctaLabel" = EXCLUDED."ctaLabel",
  "routePath" = EXCLUDED."routePath",
  "benefits" = EXCLUDED."benefits",
  "audience" = EXCLUDED."audience",
  "isActive" = EXCLUDED."isActive",
  "isFeatured" = EXCLUDED."isFeatured",
  "requiresLeadForm" = EXCLUDED."requiresLeadForm",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

INSERT INTO "HopeHubBanner" (
  "id", "title", "subtitle", "eyebrow", "ctaLabel", "routePath", "offeringId",
  "isActive", "sortOrder", "backgroundColor", "textColor", "updatedAt"
) VALUES
  ('hope-banner-goa-meetup', 'Goa wellness meetup', 'Premium in-person meetup at ₹51,000 with 40% offer active.', 'Meetup in Goa', 'Reserve seat', '/events/goa-wellness-meetup', 'hope-offer-community-meetup', true, 1, '#ecfeff', '#0f172a', NOW()),
  ('hope-banner-weekly-care', 'Weekly care package', 'Two private sessions for one focused week of support.', 'Weekly sessions', 'View weekly plan', '/packages/weekly-care-package', 'hope-offer-weekly-care', true, 2, '#eef6ff', '#0f172a', NOW()),
  ('hope-banner-monthly-care', 'Monthly care package', 'Four private sessions for steady support through the month.', 'Monthly sessions', 'View monthly plan', '/packages/monthly-care-package', 'hope-offer-monthly-care', true, 3, '#f0fdf4', '#0f172a', NOW())
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "eyebrow" = EXCLUDED."eyebrow",
  "ctaLabel" = EXCLUDED."ctaLabel",
  "routePath" = EXCLUDED."routePath",
  "offeringId" = EXCLUDED."offeringId",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "backgroundColor" = EXCLUDED."backgroundColor",
  "textColor" = EXCLUDED."textColor",
  "updatedAt" = NOW();

UPDATE "HopeHubBanner"
SET "isActive" = false, "updatedAt" = NOW()
WHERE "id" IN ('hope-banner-stress-workshop', 'hope-banner-organisation');
