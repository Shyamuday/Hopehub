CREATE TABLE "ProviderShareLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "careTeamServiceId" TEXT,
    "kind" TEXT NOT NULL,
    "mode" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderShareLink_code_key" ON "ProviderShareLink"("code");
CREATE INDEX "ProviderShareLink_doctorId_isActive_createdAt_idx" ON "ProviderShareLink"("doctorId", "isActive", "createdAt");
CREATE INDEX "ProviderShareLink_careTeamServiceId_idx" ON "ProviderShareLink"("careTeamServiceId");
ALTER TABLE "ProviderShareLink" ADD CONSTRAINT "ProviderShareLink_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderShareLink" ADD CONSTRAINT "ProviderShareLink_careTeamServiceId_fkey" FOREIGN KEY ("careTeamServiceId") REFERENCES "CareTeamService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
