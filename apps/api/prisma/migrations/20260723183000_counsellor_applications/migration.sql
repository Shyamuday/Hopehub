CREATE TYPE "CounsellorApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ONBOARDED');

CREATE TABLE "CounsellorApplication" (
  "id" TEXT NOT NULL,
  "status" "CounsellorApplicationStatus" NOT NULL DEFAULT 'NEW',
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "qualification" TEXT NOT NULL,
  "specialization" TEXT NOT NULL,
  "experienceYears" TEXT NOT NULL,
  "registrationDetails" TEXT,
  "languages" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "preferredChannel" TEXT NOT NULL,
  "resumeLink" TEXT NOT NULL,
  "portfolioLink" TEXT,
  "whyJoin" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'healing-web',
  "entryPage" TEXT,
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CounsellorApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CounsellorApplication_status_idx" ON "CounsellorApplication"("status");
CREATE INDEX "CounsellorApplication_email_idx" ON "CounsellorApplication"("email");
CREATE INDEX "CounsellorApplication_phone_idx" ON "CounsellorApplication"("phone");
CREATE INDEX "CounsellorApplication_specialization_idx" ON "CounsellorApplication"("specialization");
CREATE INDEX "CounsellorApplication_createdAt_idx" ON "CounsellorApplication"("createdAt");

ALTER TABLE "CounsellorApplication"
  ADD CONSTRAINT "CounsellorApplication_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
