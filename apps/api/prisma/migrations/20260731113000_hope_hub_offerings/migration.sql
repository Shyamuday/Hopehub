CREATE TYPE "HopeHubOfferingType" AS ENUM (
  'INDIVIDUAL_SESSION',
  'CARE_PACKAGE',
  'WORKSHOP',
  'MEETUP',
  'WEBINAR',
  'GROUP_SESSION',
  'ORGANISATION_PROGRAM',
  'CUSTOM'
);

CREATE TYPE "HopeHubDeliveryMode" AS ENUM (
  'ONLINE_AUDIO',
  'ONLINE_VIDEO',
  'CHAT',
  'GROUP_ONLINE',
  'OFFLINE',
  'HYBRID',
  'CUSTOM'
);

CREATE TYPE "HopeHubOrganizationLeadStatus" AS ENUM (
  'NEW',
  'CONTACTED',
  'PROPOSAL_SENT',
  'WON',
  'LOST'
);

CREATE TYPE "HopeHubDiscountType" AS ENUM (
  'NONE',
  'PERCENT',
  'FLAT',
  'REFERRAL',
  'CUSTOM'
);

CREATE TYPE "HopeHubPartialPaymentType" AS ENUM (
  'NONE',
  'PERCENT',
  'FLAT'
);

CREATE TABLE "HopeHubOffering" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT NOT NULL,
  "type" "HopeHubOfferingType" NOT NULL,
  "priceInPaise" INTEGER,
  "compareAtPriceInPaise" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "discountEnabled" BOOLEAN NOT NULL DEFAULT false,
  "discountType" "HopeHubDiscountType" NOT NULL DEFAULT 'NONE',
  "discountLabel" TEXT,
  "discountCode" TEXT,
  "discountPercent" INTEGER,
  "discountFlatInPaise" INTEGER,
  "discountMaxInPaise" INTEGER,
  "discountStartsAt" TIMESTAMP(3),
  "discountEndsAt" TIMESTAMP(3),
  "partialPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  "partialPaymentType" "HopeHubPartialPaymentType" NOT NULL DEFAULT 'NONE',
  "partialPaymentLabel" TEXT,
  "partialPaymentPercent" INTEGER,
  "partialPaymentFlatInPaise" INTEGER,
  "validityDays" INTEGER,
  "sessionCount" INTEGER,
  "sessionDurationMinutes" INTEGER,
  "deliveryMode" "HopeHubDeliveryMode" NOT NULL DEFAULT 'ONLINE_AUDIO',
  "eventStartsAt" TIMESTAMP(3),
  "eventEndsAt" TIMESTAMP(3),
  "seatLimit" INTEGER,
  "venue" TEXT,
  "imageUrl" TEXT,
  "ctaLabel" TEXT NOT NULL DEFAULT 'Book now',
  "routePath" TEXT,
  "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "audience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "requiresLeadForm" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HopeHubOffering_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HopeHubBanner" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "eyebrow" TEXT,
  "imageUrl" TEXT,
  "ctaLabel" TEXT NOT NULL DEFAULT 'Explore',
  "routePath" TEXT NOT NULL,
  "offeringId" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "backgroundColor" TEXT,
  "textColor" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HopeHubBanner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HopeHubOrganizationLead" (
  "id" TEXT NOT NULL,
  "organizationName" TEXT NOT NULL,
  "organizationType" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "city" TEXT,
  "audienceSize" INTEGER,
  "needType" TEXT,
  "preferredDate" TEXT,
  "notes" TEXT,
  "offeringId" TEXT,
  "status" "HopeHubOrganizationLeadStatus" NOT NULL DEFAULT 'NEW',
  "entryPage" TEXT,
  "followUpNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HopeHubOrganizationLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HopeHubOffering_code_key" ON "HopeHubOffering"("code");
CREATE UNIQUE INDEX "HopeHubOffering_slug_key" ON "HopeHubOffering"("slug");
CREATE INDEX "HopeHubOffering_type_isActive_idx" ON "HopeHubOffering"("type", "isActive");
CREATE INDEX "HopeHubOffering_isFeatured_sortOrder_idx" ON "HopeHubOffering"("isFeatured", "sortOrder");
CREATE INDEX "HopeHubOffering_eventStartsAt_idx" ON "HopeHubOffering"("eventStartsAt");
CREATE INDEX "HopeHubBanner_isActive_sortOrder_idx" ON "HopeHubBanner"("isActive", "sortOrder");
CREATE INDEX "HopeHubBanner_offeringId_idx" ON "HopeHubBanner"("offeringId");
CREATE INDEX "HopeHubOrganizationLead_status_createdAt_idx" ON "HopeHubOrganizationLead"("status", "createdAt");
CREATE INDEX "HopeHubOrganizationLead_organizationType_idx" ON "HopeHubOrganizationLead"("organizationType");
CREATE INDEX "HopeHubOrganizationLead_offeringId_idx" ON "HopeHubOrganizationLead"("offeringId");

ALTER TABLE "HopeHubBanner"
  ADD CONSTRAINT "HopeHubBanner_offeringId_fkey"
  FOREIGN KEY ("offeringId") REFERENCES "HopeHubOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HopeHubOrganizationLead"
  ADD CONSTRAINT "HopeHubOrganizationLead_offeringId_fkey"
  FOREIGN KEY ("offeringId") REFERENCES "HopeHubOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "HopeHubOffering" (
  "id", "code", "slug", "title", "subtitle", "description", "type", "priceInPaise",
  "compareAtPriceInPaise", "discountEnabled", "discountType", "discountLabel", "discountCode",
  "discountPercent", "discountFlatInPaise", "discountMaxInPaise", "discountStartsAt",
  "discountEndsAt", "partialPaymentEnabled",
  "partialPaymentType", "partialPaymentLabel", "partialPaymentPercent", "partialPaymentFlatInPaise",
  "validityDays", "sessionCount", "sessionDurationMinutes", "deliveryMode", "ctaLabel", "routePath",
  "benefits", "audience", "isActive", "isFeatured", "requiresLeadForm", "sortOrder", "updatedAt"
) VALUES
  ('hope-offer-single-session', 'SINGLE_30', 'single-30-minute-session', 'Single 30-minute session', 'Start with one focused conversation.', 'A private 30-minute online session for immediate support, clarity, and next steps.', 'INDIVIDUAL_SESSION', 50000, NULL, false, 'NONE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'NONE', NULL, NULL, NULL, 7, 1, 30, 'ONLINE_AUDIO', 'Book session', '/contact?offering=single-30-minute-session', ARRAY['30-minute private session', 'Online audio by default', 'Simple next-step guidance'], ARRAY['Individuals', 'First-time users'], true, true, false, 1, NOW()),
  ('hope-offer-weekly-care', 'WEEKLY_CARE', 'weekly-care-package', 'Weekly care package', 'Short-term support for one difficult week.', 'Two focused sessions across 7 days with continuity and gentle accountability.', 'CARE_PACKAGE', 90000, 100000, true, 'PERCENT', 'Weekly care saving', NULL, 10, NULL, NULL, NULL, NULL, true, 'FLAT', 'Book now, pay balance later', NULL, 30000, 7, 2, 30, 'ONLINE_AUDIO', 'Choose weekly care', '/contact?offering=weekly-care-package', ARRAY['2 sessions', 'Valid for 7 days', 'Good for high-stress weeks'], ARRAY['Individuals', 'Students', 'Working professionals'], true, true, false, 2, NOW()),
  ('hope-offer-monthly-care', 'MONTHLY_CARE', 'monthly-care-package', 'Monthly care package', 'Steady support through the month.', 'Four private sessions valid for 30 days for anxiety, stress, relationship concerns, or ongoing guidance.', 'CARE_PACKAGE', 180000, 200000, true, 'FLAT', 'Launch offer', NULL, NULL, 20000, NULL, NULL, NULL, true, 'PERCENT', 'Pay 40% today', 40, NULL, 30, 4, 30, 'ONLINE_AUDIO', 'Choose monthly care', '/contact?offering=monthly-care-package', ARRAY['4 sessions', 'Valid for 30 days', 'Useful for ongoing concerns'], ARRAY['Individuals', 'Couples', 'Parents'], true, true, false, 3, NOW()),
  ('hope-offer-quarterly-care', 'QUARTERLY_CARE', 'three-month-care-package', '3-month care package', 'Structured support for deeper work.', 'Twelve sessions across 90 days for users who want a consistent mental wellness plan.', 'CARE_PACKAGE', 499000, 600000, true, 'PERCENT', 'Long-care saving', NULL, 15, NULL, 100000, NULL, NULL, true, 'PERCENT', 'Pay 30% today', 30, NULL, 90, 12, 30, 'ONLINE_AUDIO', 'Choose 3-month care', '/contact?offering=three-month-care-package', ARRAY['12 sessions', 'Valid for 90 days', 'Best for consistency'], ARRAY['Individuals', 'Longer-term support'], true, true, false, 4, NOW()),
  ('hope-offer-stress-workshop', 'STRESS_WORKSHOP', 'stress-reset-workshop', 'Stress reset workshop', 'Group session for practical stress tools.', 'A guided group workshop covering stress mapping, calming routines, and daily reset practices.', 'WORKSHOP', 29900, 49900, true, 'FLAT', 'Early registration', NULL, NULL, 5000, NULL, NULL, NULL, false, 'NONE', NULL, NULL, NULL, NULL, 1, 90, 'GROUP_ONLINE', 'Register now', '/events/stress-reset-workshop', ARRAY['90-minute group workshop', 'Practical tools', 'Limited seats'], ARRAY['Students', 'Professionals', 'Teams'], true, true, false, 20, NOW()),
  ('hope-offer-community-meetup', 'COMMUNITY_MEETUP', 'goa-wellness-meetup', 'Goa wellness meetup', 'A focused in-person wellness meetup in Goa.', 'A premium guided wellness meetup in Goa with group reflection, practical emotional wellness tools, and next-step care planning.', 'MEETUP', 5100000, NULL, true, 'PERCENT', 'Goa meetup offer', NULL, 40, NULL, NULL, NULL, NULL, true, 'PERCENT', 'Reserve with 40%', 40, NULL, NULL, 1, 180, 'OFFLINE', 'Reserve seat', '/events/goa-wellness-meetup', ARRAY['In-person Goa meetup', 'Guided group wellness session', 'Care planning and follow-up direction'], ARRAY['Individuals', 'Working professionals', 'Wellness seekers'], true, true, false, 21, NOW()),
  ('hope-offer-organisation', 'ORG_WELLNESS', 'organisation-wellness-program', 'Organisation wellness program', 'For schools, colleges, corporates, NGOs, and institutions.', 'Custom mental wellness programs, workshops, counselling support, and awareness sessions for organisations.', 'ORGANISATION_PROGRAM', NULL, NULL, false, 'NONE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'NONE', NULL, NULL, NULL, NULL, NULL, NULL, 'CUSTOM', 'Request a call', '/organization', ARRAY['Custom proposal', 'Workshops and counselling', 'School, college, corporate and NGO support'], ARRAY['Schools', 'Colleges', 'Corporates', 'NGOs'], true, true, true, 30, NOW())
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
