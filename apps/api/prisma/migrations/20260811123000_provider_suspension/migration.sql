ALTER TABLE "Doctor"
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedReason" TEXT,
ADD COLUMN "suspendedById" TEXT;

CREATE INDEX "Doctor_suspendedAt_idx" ON "Doctor"("suspendedAt");
CREATE INDEX "Doctor_suspendedById_idx" ON "Doctor"("suspendedById");
