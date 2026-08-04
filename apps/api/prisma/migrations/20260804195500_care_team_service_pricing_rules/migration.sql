CREATE TYPE "CareTeamServicePricingMode" AS ENUM (
  'FIXED',
  'FREE_INTRO',
  'DISCOUNTED_FIRST',
  'PACKAGE',
  'FREE_VOLUNTEER'
);

ALTER TABLE "CareTeamService"
  ADD COLUMN "pricingMode" "CareTeamServicePricingMode" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "firstSessionPriceInPaise" INTEGER,
  ADD COLUMN "followUpPriceInPaise" INTEGER,
  ADD COLUMN "introSessionLimit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "packageSessionCount" INTEGER,
  ADD COLUMN "packagePriceInPaise" INTEGER;
