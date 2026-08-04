-- Provider earning ledger and payout tracking

DO $$ BEGIN
  CREATE TYPE "ProviderPayoutStatus" AS ENUM ('PENDING', 'HOLD', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ProviderEarning" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "doctorUserId" TEXT NOT NULL,
  "patientId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'consultation',
  "grossAmountInPaise" INTEGER NOT NULL DEFAULT 0,
  "providerSharePercent" INTEGER NOT NULL DEFAULT 0,
  "providerEarningInPaise" INTEGER NOT NULL DEFAULT 0,
  "platformFeeInPaise" INTEGER NOT NULL DEFAULT 0,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "payoutStatus" "ProviderPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "pricingMode" TEXT,
  "pricingRule" TEXT,
  "serviceTitle" TEXT,
  "packageUsage" JSONB,
  "payoutReference" TEXT,
  "payoutNote" TEXT,
  "paidAt" TIMESTAMP(3),
  "paidByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProviderEarning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderEarning_consultationId_key" ON "ProviderEarning"("consultationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderEarning_paymentId_key" ON "ProviderEarning"("paymentId");
CREATE INDEX IF NOT EXISTS "ProviderEarning_doctorUserId_payoutStatus_idx" ON "ProviderEarning"("doctorUserId", "payoutStatus");
CREATE INDEX IF NOT EXISTS "ProviderEarning_patientId_idx" ON "ProviderEarning"("patientId");
CREATE INDEX IF NOT EXISTS "ProviderEarning_paymentStatus_idx" ON "ProviderEarning"("paymentStatus");
CREATE INDEX IF NOT EXISTS "ProviderEarning_createdAt_idx" ON "ProviderEarning"("createdAt");
CREATE INDEX IF NOT EXISTS "ProviderEarning_paidAt_idx" ON "ProviderEarning"("paidAt");

DO $$ BEGIN
  ALTER TABLE "ProviderEarning"
    ADD CONSTRAINT "ProviderEarning_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderEarning"
    ADD CONSTRAINT "ProviderEarning_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderEarning"
    ADD CONSTRAINT "ProviderEarning_doctorUserId_fkey"
    FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderEarning"
    ADD CONSTRAINT "ProviderEarning_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderEarning"
    ADD CONSTRAINT "ProviderEarning_paidByUserId_fkey"
    FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
