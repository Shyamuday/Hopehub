ALTER TABLE "AssessmentDefinition"
  ADD COLUMN IF NOT EXISTS "couponDiscountType" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "couponDiscountValue" INTEGER;
