BEGIN;

CREATE TABLE "TelegramCommunityMemberIdentityHistory" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "previousFirstName" TEXT,
    "previousLastName" TEXT,
    "previousUsername" TEXT,
    "previousDisplayName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramCommunityMemberIdentityHistory_pkey" PRIMARY KEY ("id")
);

-- PostgreSQL limits identifiers to 63 bytes. Use Prisma's deterministic
-- shortened name so the clean migration result exactly matches the schema.
CREATE INDEX "TelegramCommunityMemberIdentityHistory_chatId_telegramUserI_idx"
  ON "TelegramCommunityMemberIdentityHistory"("chatId", "telegramUserId", "observedAt");

CREATE INDEX "TelegramCommunityMemberIdentityHistory_chatId_observedAt_idx"
  ON "TelegramCommunityMemberIdentityHistory"("chatId", "observedAt");

COMMIT;
