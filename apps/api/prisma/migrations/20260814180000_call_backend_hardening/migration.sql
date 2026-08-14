ALTER TABLE "ConsultationCallSession"
  ADD COLUMN "activeKey" TEXT,
  ADD COLUMN "qualitySummary" JSONB,
  ADD COLUMN "reconnectCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "usedTurnRelay" BOOLEAN,
  ADD COLUMN "averageRttMs" INTEGER,
  ADD COLUMN "packetLossPercent" DOUBLE PRECISION,
  ADD COLUMN "maxJitterMs" INTEGER;

WITH ranked_active AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "consultationId"
      ORDER BY "updatedAt" DESC, "startedAt" DESC, "id" DESC
    ) AS active_rank
  FROM "ConsultationCallSession"
  WHERE "endedAt" IS NULL
    AND "status" IN ('RINGING', 'CONNECTING', 'CONNECTED', 'RECONNECTING')
)
UPDATE "ConsultationCallSession" AS session
SET
  "status" = 'FAILED',
  "endedAt" = CURRENT_TIMESTAMP,
  "endReason" = 'migration_duplicate_active_cleanup',
  "lastSignalEvent" = 'call:migration-cleanup'
FROM ranked_active
WHERE session."id" = ranked_active."id"
  AND ranked_active.active_rank > 1;

UPDATE "ConsultationCallSession"
SET "activeKey" = "consultationId"
WHERE "endedAt" IS NULL
  AND "status" IN ('RINGING', 'CONNECTING', 'CONNECTED', 'RECONNECTING');

CREATE UNIQUE INDEX "ConsultationCallSession_activeKey_key"
  ON "ConsultationCallSession"("activeKey");
CREATE INDEX "ConsultationCallSession_endedAt_idx"
  ON "ConsultationCallSession"("endedAt");

CREATE TABLE "PushDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "storeStaffId" TEXT,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'FCM',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PushDevice_storeStaffId_fkey"
    FOREIGN KEY ("storeStaffId") REFERENCES "StoreStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PushDevice_owner_check"
    CHECK (("userId" IS NOT NULL)::integer + ("storeStaffId" IS NOT NULL)::integer = 1)
);

CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");
CREATE INDEX "PushDevice_userId_isActive_idx" ON "PushDevice"("userId", "isActive");
CREATE INDEX "PushDevice_storeStaffId_isActive_idx" ON "PushDevice"("storeStaffId", "isActive");
CREATE INDEX "PushDevice_lastSeenAt_idx" ON "PushDevice"("lastSeenAt");
