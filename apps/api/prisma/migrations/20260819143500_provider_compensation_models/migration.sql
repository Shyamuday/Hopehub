CREATE TYPE "ProviderEarningModel" AS ENUM (
  'PROVIDER_PERCENTAGE',
  'FIXED_PROVIDER_AMOUNT',
  'PLATFORM_PERCENTAGE',
  'FIXED_PLATFORM_FEE',
  'HYBRID_PLATFORM_FEE'
);

ALTER TABLE "Doctor"
  ADD COLUMN "providerEarningModel" "ProviderEarningModel" NOT NULL DEFAULT 'PROVIDER_PERCENTAGE',
  ADD COLUMN "providerFixedEarningInPaise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "platformFeePercent" INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN "platformFixedFeeInPaise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "minimumProviderEarningInPaise" INTEGER,
  ADD COLUMN "maximumPlatformFeeInPaise" INTEGER,
  ADD COLUMN "compensationUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "compensationUpdatedById" TEXT;

UPDATE "Doctor"
SET "platformFeePercent" = GREATEST(0, LEAST(100, 100 - "consultationSharePercent"));

ALTER TABLE "ProviderEarning"
  ADD COLUMN "earningModel" TEXT NOT NULL DEFAULT 'PROVIDER_PERCENTAGE',
  ADD COLUMN "configuredPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "configuredFixedInPaise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "compensationSnapshot" JSONB;

UPDATE "ProviderEarning"
SET "configuredPercent" = "providerSharePercent";

CREATE TABLE "ProviderCompensationAudit" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderCompensationAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProviderCompensationAudit_doctorId_createdAt_idx" ON "ProviderCompensationAudit"("doctorId", "createdAt");
CREATE INDEX "ProviderCompensationAudit_actorUserId_createdAt_idx" ON "ProviderCompensationAudit"("actorUserId", "createdAt");
