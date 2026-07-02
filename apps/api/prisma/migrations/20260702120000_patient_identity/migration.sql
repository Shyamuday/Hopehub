-- Patient identity: unique patient codes, shared mobiles, clinic association

DROP INDEX IF EXISTS "User_mobile_key";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "patientCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homeClinicStoreId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_patientCode_key" ON "User"("patientCode");
CREATE INDEX IF NOT EXISTS "User_mobile_idx" ON "User"("mobile");
CREATE INDEX IF NOT EXISTS "User_homeClinicStoreId_idx" ON "User"("homeClinicStoreId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_homeClinicStoreId_fkey"
  FOREIGN KEY ("homeClinicStoreId") REFERENCES "Store"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Consultation" ADD COLUMN IF NOT EXISTS "clinicStoreId" TEXT;

ALTER TABLE "Consultation"
  ADD CONSTRAINT "Consultation_clinicStoreId_fkey"
  FOREIGN KEY ("clinicStoreId") REFERENCES "Store"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill patient codes for existing patients
DO $$
DECLARE
  rec RECORD;
  seq INT := 0;
BEGIN
  FOR rec IN
    SELECT id FROM "User" WHERE role = 'PATIENT' AND "patientCode" IS NULL ORDER BY "createdAt"
  LOOP
    seq := seq + 1;
    UPDATE "User" SET "patientCode" = 'GEN-' || LPAD(seq::text, 6, '0') WHERE id = rec.id;
  END LOOP;
END $$;
