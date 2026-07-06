-- Per-doctor default prescribing approach + per-case approach on case analysis
ALTER TABLE "Doctor" ADD COLUMN "defaultMethodOptionId" TEXT;

ALTER TABLE "CaseAnalysis" ADD COLUMN "methodOptionId" TEXT;

ALTER TABLE "Doctor"
  ADD CONSTRAINT "Doctor_defaultMethodOptionId_fkey"
  FOREIGN KEY ("defaultMethodOptionId") REFERENCES "PrescriptionOption"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseAnalysis"
  ADD CONSTRAINT "CaseAnalysis_methodOptionId_fkey"
  FOREIGN KEY ("methodOptionId") REFERENCES "PrescriptionOption"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Doctor_defaultMethodOptionId_idx" ON "Doctor"("defaultMethodOptionId");
CREATE INDEX "CaseAnalysis_methodOptionId_idx" ON "CaseAnalysis"("methodOptionId");
