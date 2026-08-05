ALTER TYPE "CareTeamServicePricingMode" ADD VALUE IF NOT EXISTS 'PER_MINUTE';

ALTER TABLE "CareTeamService"
  ADD COLUMN IF NOT EXISTS "freeMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pricePerMinuteInPaise" INTEGER;

ALTER TABLE "CareTeamPricingTemplate"
  ADD COLUMN IF NOT EXISTS "freeMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pricePerMinuteInPaise" INTEGER;

INSERT INTO "CareTeamPricingTemplate"
  ("id", "title", "description", "pricingMode", "priceInPaise", "firstSessionPriceInPaise", "followUpPriceInPaise", "introSessionLimit", "packageSessionCount", "packagePriceInPaise", "freeMinutes", "pricePerMinuteInPaise", "durationMinutes", "isFree", "isActive", "sortOrder", "updatedAt")
VALUES
  ('per-minute-5-free-20', 'First 5 min free, then ₹20/min', 'Flexible minute-based support for short calls.', 'PER_MINUTE', 0, NULL, NULL, 1, NULL, NULL, 5, 2000, 30, false, true, 80, CURRENT_TIMESTAMP),
  ('per-minute-10-free-25', 'First 10 min free, then ₹25/min', 'Minute-based support with a longer free intro.', 'PER_MINUTE', 0, NULL, NULL, 1, NULL, NULL, 10, 2500, 40, false, true, 90, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
