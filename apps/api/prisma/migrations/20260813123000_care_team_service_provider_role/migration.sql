ALTER TABLE "CareTeamService"
  ADD COLUMN "providerRole" "CareTeamMemberType";

UPDATE "CareTeamService" service
SET "providerRole" = profile."careTeamType"
FROM "MentalHealthProviderProfile" profile
WHERE service."mentalHealthProfileId" = profile."id"
  AND service."providerRole" IS NULL;

CREATE INDEX "CareTeamService_providerRole_isActive_idx"
  ON "CareTeamService"("providerRole", "isActive");
