-- Patient self-diagnosis worksheets (extensible tool keys: kingdom, miasm, …)
CREATE TABLE "PatientSelfDiagnosisResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSelfDiagnosisResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientSelfDiagnosisResult_patientId_toolKey_key" ON "PatientSelfDiagnosisResult"("patientId", "toolKey");

CREATE INDEX "PatientSelfDiagnosisResult_patientId_idx" ON "PatientSelfDiagnosisResult"("patientId");

ALTER TABLE "PatientSelfDiagnosisResult" ADD CONSTRAINT "PatientSelfDiagnosisResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
