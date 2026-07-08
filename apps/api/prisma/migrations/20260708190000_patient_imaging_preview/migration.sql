ALTER TYPE "ImagingInterpretationStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ImagingInterpretationStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "ImagingInterpretationStatus" ADD VALUE IF NOT EXISTS 'FAILED';

ALTER TABLE "ImagingInterpretation" ADD COLUMN IF NOT EXISTS "patientPreviewSnapshot" JSONB;
ALTER TABLE "ImagingInterpretation" ADD COLUMN IF NOT EXISTS "patientViewedAt" TIMESTAMP(3);
ALTER TABLE "ImagingInterpretation" ADD COLUMN IF NOT EXISTS "visibleToPatient" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ImagingInterpretation" ADD COLUMN IF NOT EXISTS "analysisJobStatus" TEXT NOT NULL DEFAULT 'READY';
