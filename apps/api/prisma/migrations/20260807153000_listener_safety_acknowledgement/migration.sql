ALTER TABLE "MentalHealthProviderProfile"
ADD COLUMN "listenerSafetyAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN "listenerSafetyAcknowledgedVersion" TEXT;

CREATE INDEX "MentalHealthProviderProfile_listenerSafetyAcknowledgedAt_idx"
ON "MentalHealthProviderProfile"("listenerSafetyAcknowledgedAt");
