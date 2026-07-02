-- Admin support case notes for consumer troubleshooting

CREATE TYPE "SupportNoteCategory" AS ENUM ('GENERAL', 'BILLING', 'ADHERENCE', 'TECHNICAL', 'ESCALATION');

CREATE TABLE "SupportCaseNote" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "consultationId" TEXT,
  "authorId" TEXT NOT NULL,
  "category" "SupportNoteCategory" NOT NULL DEFAULT 'GENERAL',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportCaseNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportCaseNote_patientId_createdAt_idx" ON "SupportCaseNote"("patientId", "createdAt");
CREATE INDEX "SupportCaseNote_consultationId_idx" ON "SupportCaseNote"("consultationId");

ALTER TABLE "SupportCaseNote"
  ADD CONSTRAINT "SupportCaseNote_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportCaseNote"
  ADD CONSTRAINT "SupportCaseNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportCaseNote"
  ADD CONSTRAINT "SupportCaseNote_consultationId_fkey"
  FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
