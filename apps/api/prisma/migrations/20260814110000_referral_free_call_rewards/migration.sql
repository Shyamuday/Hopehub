CREATE TYPE "ReferralFreeCallRewardStatus" AS ENUM ('AVAILABLE', 'REDEEMED', 'REVOKED');

CREATE TABLE "ReferralFreeCallReward" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "cycle" INTEGER NOT NULL,
  "couponCode" TEXT NOT NULL,
  "status" "ReferralFreeCallRewardStatus" NOT NULL DEFAULT 'AVAILABLE',
  "qualifyingReferralCount" INTEGER NOT NULL DEFAULT 5,
  "qualifyingReferralIds" JSONB NOT NULL DEFAULT '[]',
  "redeemedConsultationId" TEXT,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "redeemedAt" TIMESTAMP(3),
  CONSTRAINT "ReferralFreeCallReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralFreeCallReward_couponCode_key" ON "ReferralFreeCallReward"("couponCode");
CREATE UNIQUE INDEX "ReferralFreeCallReward_redeemedConsultationId_key" ON "ReferralFreeCallReward"("redeemedConsultationId");
CREATE UNIQUE INDEX "ReferralFreeCallReward_patientId_cycle_key" ON "ReferralFreeCallReward"("patientId", "cycle");
CREATE INDEX "ReferralFreeCallReward_patientId_status_earnedAt_idx" ON "ReferralFreeCallReward"("patientId", "status", "earnedAt");

ALTER TABLE "ReferralFreeCallReward"
ADD CONSTRAINT "ReferralFreeCallReward_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "RewardProgramRule"
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'REF_REFERRER_BONUS';
