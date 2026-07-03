-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BRANCH_OWNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PATIENT_COORDINATOR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CALL_CENTER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CORPORATE_WELLNESS';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'INSURANCE_PARTNER';

-- CreateEnum
CREATE TYPE "InsuranceClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- BranchOwnerProfile
CREATE TABLE "BranchOwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL DEFAULT 'Branch Owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BranchOwnerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BranchOwnerProfile_userId_key" ON "BranchOwnerProfile"("userId");
CREATE UNIQUE INDEX "BranchOwnerProfile_employeeId_key" ON "BranchOwnerProfile"("employeeId");
CREATE INDEX "BranchOwnerProfile_storeId_idx" ON "BranchOwnerProfile"("storeId");
ALTER TABLE "BranchOwnerProfile" ADD CONSTRAINT "BranchOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchOwnerProfile" ADD CONSTRAINT "BranchOwnerProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PatientCoordinatorProfile
CREATE TABLE "PatientCoordinatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL DEFAULT 'Patient Coordinator',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientCoordinatorProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientCoordinatorProfile_userId_key" ON "PatientCoordinatorProfile"("userId");
CREATE UNIQUE INDEX "PatientCoordinatorProfile_employeeId_key" ON "PatientCoordinatorProfile"("employeeId");
CREATE INDEX "PatientCoordinatorProfile_storeId_idx" ON "PatientCoordinatorProfile"("storeId");
ALTER TABLE "PatientCoordinatorProfile" ADD CONSTRAINT "PatientCoordinatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientCoordinatorProfile" ADD CONSTRAINT "PatientCoordinatorProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CallCenterProfile
CREATE TABLE "CallCenterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL DEFAULT 'Call Center Agent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallCenterProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CallCenterProfile_userId_key" ON "CallCenterProfile"("userId");
CREATE UNIQUE INDEX "CallCenterProfile_employeeId_key" ON "CallCenterProfile"("employeeId");
ALTER TABLE "CallCenterProfile" ADD CONSTRAINT "CallCenterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MarketingProfile
CREATE TABLE "MarketingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL DEFAULT 'Marketing Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingProfile_userId_key" ON "MarketingProfile"("userId");
CREATE UNIQUE INDEX "MarketingProfile_employeeId_key" ON "MarketingProfile"("employeeId");
ALTER TABLE "MarketingProfile" ADD CONSTRAINT "MarketingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CorporateAccount
CREATE TABLE "CorporateAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CorporateAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CorporateAccount_code_key" ON "CorporateAccount"("code");

-- CorporateWellnessProfile
CREATE TABLE "CorporateWellnessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "corporateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CorporateWellnessProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CorporateWellnessProfile_userId_key" ON "CorporateWellnessProfile"("userId");
CREATE INDEX "CorporateWellnessProfile_corporateId_idx" ON "CorporateWellnessProfile"("corporateId");
ALTER TABLE "CorporateWellnessProfile" ADD CONSTRAINT "CorporateWellnessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateWellnessProfile" ADD CONSTRAINT "CorporateWellnessProfile_corporateId_fkey" FOREIGN KEY ("corporateId") REFERENCES "CorporateAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CorporateEnrollment
CREATE TABLE "CorporateEnrollment" (
    "id" TEXT NOT NULL,
    "corporateId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorporateEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CorporateEnrollment_corporateId_patientId_key" ON "CorporateEnrollment"("corporateId", "patientId");
CREATE INDEX "CorporateEnrollment_corporateId_idx" ON "CorporateEnrollment"("corporateId");
ALTER TABLE "CorporateEnrollment" ADD CONSTRAINT "CorporateEnrollment_corporateId_fkey" FOREIGN KEY ("corporateId") REFERENCES "CorporateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateEnrollment" ADD CONSTRAINT "CorporateEnrollment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- InsurancePartnerProfile
CREATE TABLE "InsurancePartnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InsurancePartnerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsurancePartnerProfile_userId_key" ON "InsurancePartnerProfile"("userId");
CREATE UNIQUE INDEX "InsurancePartnerProfile_companyCode_key" ON "InsurancePartnerProfile"("companyCode");
ALTER TABLE "InsurancePartnerProfile" ADD CONSTRAINT "InsurancePartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- InsuranceClaim
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "InsuranceClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "claimAmountInPaise" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");
CREATE INDEX "InsuranceClaim_partnerId_status_idx" ON "InsuranceClaim"("partnerId", "status");
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "InsurancePartnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
