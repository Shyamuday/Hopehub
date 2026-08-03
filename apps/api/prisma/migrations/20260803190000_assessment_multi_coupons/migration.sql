CREATE TABLE IF NOT EXISTS "AssessmentCoupon" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT,
  "discountType" TEXT NOT NULL DEFAULT 'FREE',
  "discountValue" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "maxRedemptions" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentCoupon_assessmentId_code_key"
  ON "AssessmentCoupon"("assessmentId", "code");

CREATE INDEX IF NOT EXISTS "AssessmentCoupon_code_isActive_idx"
  ON "AssessmentCoupon"("code", "isActive");

CREATE INDEX IF NOT EXISTS "AssessmentCoupon_assessmentId_isActive_idx"
  ON "AssessmentCoupon"("assessmentId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssessmentCoupon_assessmentId_fkey'
  ) THEN
    ALTER TABLE "AssessmentCoupon"
      ADD CONSTRAINT "AssessmentCoupon_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "AssessmentDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
