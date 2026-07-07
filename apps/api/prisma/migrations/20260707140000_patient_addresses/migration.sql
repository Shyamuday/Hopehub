-- Patient address book for deliveries
CREATE TYPE "PatientAddressType" AS ENUM ('HOME', 'WORK', 'OTHER');

CREATE TABLE "PatientAddress" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressType" "PatientAddressType" NOT NULL DEFAULT 'HOME',
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "deliveryInstructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientAddress_patientId_isActive_idx" ON "PatientAddress"("patientId", "isActive");
CREATE INDEX "PatientAddress_patientId_isDefault_idx" ON "PatientAddress"("patientId", "isDefault");

ALTER TABLE "PatientAddress" ADD CONSTRAINT "PatientAddress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicineDelivery" ADD COLUMN "patientAddressId" TEXT;
ALTER TABLE "MedicineDelivery" ADD CONSTRAINT "MedicineDelivery_patientAddressId_fkey" FOREIGN KEY ("patientAddressId") REFERENCES "PatientAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
