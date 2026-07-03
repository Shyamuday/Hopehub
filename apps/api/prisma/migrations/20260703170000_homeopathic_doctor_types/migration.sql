-- CreateEnum
CREATE TYPE "HomeopathicDoctorType" AS ENUM (
  'CHIEF_CONSULTANT',
  'JUNIOR_DOCTOR',
  'SPECIALIST_CONSULTANT',
  'VISITING_DOCTOR',
  'TELEMEDICINE_DOCTOR',
  'MEDICAL_INTERN',
  'RESIDENT_MEDICAL_OFFICER'
);

-- CreateEnum
CREATE TYPE "HomeopathicSpecialtyFocus" AS ENUM (
  'SKIN',
  'CHILD',
  'WOMENS_HEALTH',
  'CHRONIC_DISEASES'
);

-- AlterTable
ALTER TABLE "Doctor"
  ADD COLUMN "doctorType" "HomeopathicDoctorType" NOT NULL DEFAULT 'JUNIOR_DOCTOR',
  ADD COLUMN "specialtyFocus" "HomeopathicSpecialtyFocus";
