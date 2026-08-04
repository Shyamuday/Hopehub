CREATE TABLE "CareTeamPricingTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "pricingMode" "CareTeamServicePricingMode" NOT NULL DEFAULT 'FIXED',
  "priceInPaise" INTEGER NOT NULL DEFAULT 0,
  "firstSessionPriceInPaise" INTEGER,
  "followUpPriceInPaise" INTEGER,
  "introSessionLimit" INTEGER NOT NULL DEFAULT 1,
  "packageSessionCount" INTEGER,
  "packagePriceInPaise" INTEGER,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareTeamPricingTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareTeamPricingTemplate_isActive_sortOrder_idx"
  ON "CareTeamPricingTemplate"("isActive", "sortOrder");

INSERT INTO "CareTeamPricingTemplate"
  ("id", "title", "description", "pricingMode", "priceInPaise", "firstSessionPriceInPaise", "followUpPriceInPaise", "introSessionLimit", "packageSessionCount", "packagePriceInPaise", "durationMinutes", "isFree", "isActive", "sortOrder", "updatedAt")
VALUES
  ('fixed-500-30', 'Fixed ₹500 / 30 min', 'Standard paid care-team session.', 'FIXED', 50000, NULL, NULL, 1, NULL, NULL, 30, false, true, 10, CURRENT_TIMESTAMP),
  ('fixed-600-40', 'Fixed ₹600 / 40 min', 'Longer paid care-team session.', 'FIXED', 60000, NULL, NULL, 1, NULL, NULL, 40, false, true, 20, CURRENT_TIMESTAMP),
  ('first-free-then-600', 'First session free, then ₹600', 'Good for intro calls and trust-building.', 'FREE_INTRO', 60000, 0, 60000, 1, NULL, NULL, 30, false, true, 30, CURRENT_TIMESTAMP),
  ('first-300-then-600', 'First ₹300, then ₹600', 'Discounted first session followed by regular pricing.', 'DISCOUNTED_FIRST', 60000, 30000, 60000, 1, NULL, NULL, 40, false, true, 40, CURRENT_TIMESTAMP),
  ('package-4-1800', '4-session package ₹1800', 'Starter package for ongoing support.', 'PACKAGE', 0, NULL, NULL, 1, 4, 180000, 40, false, true, 50, CURRENT_TIMESTAMP),
  ('package-8-3200', '8-session package ₹3200', 'Deeper continuity package.', 'PACKAGE', 0, NULL, NULL, 1, 8, 320000, 40, false, true, 60, CURRENT_TIMESTAMP),
  ('free-volunteer-20', 'Free volunteer talk / 20 min', 'Non-clinical peer or volunteer support.', 'FREE_VOLUNTEER', 0, NULL, NULL, 1, NULL, NULL, 20, true, true, 70, CURRENT_TIMESTAMP);
