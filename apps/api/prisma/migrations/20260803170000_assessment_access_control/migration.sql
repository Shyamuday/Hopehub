ALTER TABLE "AssessmentDefinition"
  ADD COLUMN IF NOT EXISTS "accessMode" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "priceInPaise" INTEGER,
  ADD COLUMN IF NOT EXISTS "couponCode" TEXT,
  ADD COLUMN IF NOT EXISTS "couponLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "couponStartsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "couponEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "couponMaxRedemptions" INTEGER,
  ADD COLUMN IF NOT EXISTS "accessNote" TEXT;

CREATE INDEX IF NOT EXISTS "AssessmentDefinition_accessMode_idx"
  ON "AssessmentDefinition"("accessMode");

CREATE TABLE IF NOT EXISTS "AssessmentAccessGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "couponCode" TEXT,
  "paymentId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentAccessGrant_userId_assessmentId_source_couponCode_key"
  ON "AssessmentAccessGrant"("userId", "assessmentId", "source", "couponCode");

CREATE INDEX IF NOT EXISTS "AssessmentAccessGrant_assessmentId_createdAt_idx"
  ON "AssessmentAccessGrant"("assessmentId", "createdAt");

CREATE INDEX IF NOT EXISTS "AssessmentAccessGrant_userId_createdAt_idx"
  ON "AssessmentAccessGrant"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "AssessmentCouponRedemption" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "couponCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentCouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentCouponRedemption_userId_assessmentId_couponCode_key"
  ON "AssessmentCouponRedemption"("userId", "assessmentId", "couponCode");

CREATE INDEX IF NOT EXISTS "AssessmentCouponRedemption_assessmentId_couponCode_idx"
  ON "AssessmentCouponRedemption"("assessmentId", "couponCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentAccessGrant_userId_fkey'
  ) THEN
    ALTER TABLE "AssessmentAccessGrant"
      ADD CONSTRAINT "AssessmentAccessGrant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentAccessGrant_assessmentId_fkey'
  ) THEN
    ALTER TABLE "AssessmentAccessGrant"
      ADD CONSTRAINT "AssessmentAccessGrant_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "AssessmentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentCouponRedemption_userId_fkey'
  ) THEN
    ALTER TABLE "AssessmentCouponRedemption"
      ADD CONSTRAINT "AssessmentCouponRedemption_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentCouponRedemption_assessmentId_fkey'
  ) THEN
    ALTER TABLE "AssessmentCouponRedemption"
      ADD CONSTRAINT "AssessmentCouponRedemption_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "AssessmentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
