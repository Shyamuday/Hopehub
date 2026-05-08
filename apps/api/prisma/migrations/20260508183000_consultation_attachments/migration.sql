-- ConsultationAttachment for omnichannel files (patient labs + doctor clinical photos)

CREATE TYPE "ConsultationAttachmentKind" AS ENUM ('PATIENT_REPORT', 'DOCTOR_CLINICAL', 'OTHER');

CREATE TABLE "ConsultationAttachment" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "kind" "ConsultationAttachmentKind" NOT NULL DEFAULT 'OTHER',
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsultationAttachment_consultationId_idx" ON "ConsultationAttachment"("consultationId");

ALTER TABLE "ConsultationAttachment" ADD CONSTRAINT "ConsultationAttachment_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultationAttachment" ADD CONSTRAINT "ConsultationAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
