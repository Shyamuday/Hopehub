ALTER TABLE "MentalHealthProviderProfile"
  ADD COLUMN "careTeamTypes" "CareTeamMemberType"[] NOT NULL DEFAULT ARRAY[]::"CareTeamMemberType"[];

UPDATE "MentalHealthProviderProfile"
SET "careTeamTypes" = ARRAY["careTeamType"]::"CareTeamMemberType"[]
WHERE cardinality("careTeamTypes") = 0;
