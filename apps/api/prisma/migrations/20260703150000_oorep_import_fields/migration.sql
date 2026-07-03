-- OOREP import support: external rubric/remedy IDs and additional GPL sources

ALTER TYPE "RepertorySourceCode" ADD VALUE IF NOT EXISTS 'OOREP_PUBLICUM';
ALTER TYPE "RepertorySourceCode" ADD VALUE IF NOT EXISTS 'OOREP_KENT_DE';

ALTER TABLE "HomeopathicRemedy" ADD COLUMN IF NOT EXISTS "oorepRemedyId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "HomeopathicRemedy_oorepRemedyId_key" ON "HomeopathicRemedy"("oorepRemedyId");

ALTER TABLE "RepertoryRubric" ADD COLUMN IF NOT EXISTS "externalId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "RepertoryRubric_sourceId_externalId_key" ON "RepertoryRubric"("sourceId", "externalId");
