-- CreateEnum
CREATE TYPE "LabReferralStatus" AS ENUM ('SENT', 'ACCEPTED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'RESULT_READY', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DIAGNOSTIC_PARTNER';

-- CreateTable
CREATE TABLE "DiagnosticCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCenterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diagnosticCenterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticCenterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReferral" (
    "id" TEXT NOT NULL,
    "referralNumber" TEXT NOT NULL,
    "diagnosticCenterId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "status" "LabReferralStatus" NOT NULL DEFAULT 'SENT',
    "clinicalNotes" TEXT,
    "partnerNotes" TEXT,
    "expectedResultDate" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReferralLine" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "specimen" TEXT,
    "resultSummary" TEXT,
    "resultFileUrl" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LabReferralLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticCenter_code_key" ON "DiagnosticCenter"("code");
CREATE UNIQUE INDEX "DiagnosticCenterProfile_userId_key" ON "DiagnosticCenterProfile"("userId");
CREATE INDEX "DiagnosticCenterProfile_diagnosticCenterId_idx" ON "DiagnosticCenterProfile"("diagnosticCenterId");
CREATE UNIQUE INDEX "LabReferral_referralNumber_key" ON "LabReferral"("referralNumber");
CREATE INDEX "LabReferral_diagnosticCenterId_status_idx" ON "LabReferral"("diagnosticCenterId", "status");
CREATE INDEX "LabReferral_storeId_status_idx" ON "LabReferral"("storeId", "status");
CREATE INDEX "LabReferral_patientId_idx" ON "LabReferral"("patientId");
CREATE INDEX "LabReferralLine_referralId_idx" ON "LabReferralLine"("referralId");

-- AddForeignKey
ALTER TABLE "DiagnosticCenterProfile" ADD CONSTRAINT "DiagnosticCenterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCenterProfile" ADD CONSTRAINT "DiagnosticCenterProfile_diagnosticCenterId_fkey" FOREIGN KEY ("diagnosticCenterId") REFERENCES "DiagnosticCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabReferral" ADD CONSTRAINT "LabReferral_diagnosticCenterId_fkey" FOREIGN KEY ("diagnosticCenterId") REFERENCES "DiagnosticCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabReferral" ADD CONSTRAINT "LabReferral_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabReferral" ADD CONSTRAINT "LabReferral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabReferral" ADD CONSTRAINT "LabReferral_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabReferralLine" ADD CONSTRAINT "LabReferralLine_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "LabReferral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
