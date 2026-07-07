-- Patient profile expansion
CREATE TYPE "PatientGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY');
CREATE TYPE "LifestyleStatus" AS ENUM ('NEVER', 'FORMER', 'OCCASIONAL', 'REGULAR', 'PREFER_NOT_TO_SAY');

ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "gender" "PatientGender";
ALTER TABLE "User" ADD COLUMN "bloodGroup" TEXT;
ALTER TABLE "User" ADD COLUMN "alternateMobile" TEXT;
ALTER TABLE "User" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "User" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "state" TEXT;
ALTER TABLE "User" ADD COLUMN "pincode" TEXT;
ALTER TABLE "User" ADD COLUMN "country" TEXT DEFAULT 'India';
ALTER TABLE "User" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "User" ADD COLUMN "emergencyContactPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "emergencyContactRelation" TEXT;
ALTER TABLE "User" ADD COLUMN "occupation" TEXT;
ALTER TABLE "User" ADD COLUMN "maritalStatus" "MaritalStatus";
ALTER TABLE "User" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "User" ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "pastSurgeries" TEXT;
ALTER TABLE "User" ADD COLUMN "familyMedicalHistory" TEXT;
ALTER TABLE "User" ADD COLUMN "smokingStatus" "LifestyleStatus";
ALTER TABLE "User" ADD COLUMN "alcoholUse" "LifestyleStatus";
ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT;
ALTER TABLE "User" ADD COLUMN "patientNotes" TEXT;
