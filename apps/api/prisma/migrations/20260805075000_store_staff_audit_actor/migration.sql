ALTER TABLE "AuditLog"
  ADD COLUMN "actorStoreStaffId" TEXT,
  ADD COLUMN "actorStoreRole" "StoreRole";

CREATE INDEX "AuditLog_actorStoreStaffId_idx" ON "AuditLog"("actorStoreStaffId");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorStoreStaffId_fkey"
  FOREIGN KEY ("actorStoreStaffId") REFERENCES "StoreStaff"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
