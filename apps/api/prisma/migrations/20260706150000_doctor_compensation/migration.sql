-- CreateEnum
CREATE TYPE "DoctorCompensationModel" AS ENUM ('SALARIED', 'CONSULT_ONLY', 'HYBRID');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN "compensationModel" "DoctorCompensationModel" NOT NULL DEFAULT 'HYBRID';
ALTER TABLE "Doctor" ADD COLUMN "consultationSharePercent" INTEGER NOT NULL DEFAULT 60;

-- Visiting doctors default to consultation-only
UPDATE "Doctor" SET "compensationModel" = 'CONSULT_ONLY' WHERE "doctorType" = 'VISITING_DOCTOR';
