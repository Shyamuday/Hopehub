-- A contributor record is not a User or Doctor account. This keeps onboarding
-- reviewable and prevents student/peer applications from gaining clinical access.
CREATE TYPE "CareContributorStatus" AS ENUM (
  'PENDING_ORIENTATION',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE'
);

CREATE TYPE "CareContributorServiceScope" AS ENUM (
  'CLINICAL_PSYCHOLOGY',
  'SUPERVISED_STUDENT_SUPPORT',
  'NON_CLINICAL_PEER_SUPPORT'
);

CREATE TYPE "CredentialVerificationStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'VERIFIED',
  'EXPIRED',
  'REJECTED'
);

CREATE TABLE "CareContributor" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "applicationTrack" "CounsellorApplicationTrack" NOT NULL,
  "serviceScope" "CareContributorServiceScope" NOT NULL,
  "status" "CareContributorStatus" NOT NULL DEFAULT 'PENDING_ORIENTATION',
  "credentialVerificationStatus" "CredentialVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "qualification" TEXT,
  "specialization" TEXT,
  "registrationDetails" TEXT,
  "languages" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "supervisionDetails" TEXT,
  "nonClinicalAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
  "credentialVerifiedAt" TIMESTAMP(3),
  "supervisionVerifiedAt" TIMESTAMP(3),
  "orientationCompletedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "onboardingNote" TEXT,
  "platformAccountLinkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareContributor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareContributor_applicationId_key" ON "CareContributor"("applicationId");
CREATE INDEX "CareContributor_status_idx" ON "CareContributor"("status");
CREATE INDEX "CareContributor_applicationTrack_idx" ON "CareContributor"("applicationTrack");
CREATE INDEX "CareContributor_serviceScope_idx" ON "CareContributor"("serviceScope");
CREATE INDEX "CareContributor_email_idx" ON "CareContributor"("email");

ALTER TABLE "CareContributor"
  ADD CONSTRAINT "CareContributor_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "CounsellorApplication"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
