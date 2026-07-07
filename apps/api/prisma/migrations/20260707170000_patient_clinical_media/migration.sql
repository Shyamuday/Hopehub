-- Expand ClinicalMediaType enum
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'EYE';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'EAR';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'WOUND';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'JOINT';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'POSTURE';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'DENTAL';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'ABDOMEN';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'CHEST';
ALTER TYPE "ClinicalMediaType" ADD VALUE IF NOT EXISTS 'LIMBS';

-- AlterTable
ALTER TABLE "ClinicalMedia" ADD COLUMN "patientId" TEXT;
ALTER TABLE "ClinicalMedia" ADD COLUMN "consultationId" TEXT;
ALTER TABLE "ClinicalMedia" ADD COLUMN "diseaseId" TEXT;
ALTER TABLE "ClinicalMedia" ADD COLUMN "conditionLabel" TEXT;

-- Backfill patientId from case analysis consultation
UPDATE "ClinicalMedia" cm
SET "patientId" = c."patientId",
    "consultationId" = ca."consultationId"
FROM "CaseAnalysis" ca
JOIN "Consultation" c ON ca."consultationId" = c.id
WHERE cm."caseAnalysisId" = ca.id
  AND cm."patientId" IS NULL;

-- Remove orphaned clinical media that cannot be tied to a patient
DELETE FROM "ClinicalMedia" WHERE "patientId" IS NULL;

-- Make patientId required; caseAnalysisId optional
ALTER TABLE "ClinicalMedia" ALTER COLUMN "patientId" SET NOT NULL;
ALTER TABLE "ClinicalMedia" ALTER COLUMN "caseAnalysisId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ClinicalMedia_patientId_createdAt_idx" ON "ClinicalMedia"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClinicalMedia" ADD CONSTRAINT "ClinicalMedia_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalMedia" ADD CONSTRAINT "ClinicalMedia_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalMedia" ADD CONSTRAINT "ClinicalMedia_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
