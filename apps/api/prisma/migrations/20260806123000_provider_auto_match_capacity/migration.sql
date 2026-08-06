ALTER TABLE "MentalHealthProviderProfile"
  ADD COLUMN "autoMatchEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "acceptingNewUsers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "maxSessionsPerDay" INTEGER,
  ADD COLUMN "maxSessionsPerWeek" INTEGER;

CREATE INDEX "MentalHealthProviderProfile_autoMatchEnabled_acceptingNewUsers_idx"
  ON "MentalHealthProviderProfile"("autoMatchEnabled", "acceptingNewUsers");
