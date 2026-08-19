CREATE TABLE "TelegramAccountLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botKind" "TelegramBotKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramAccountLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramAccountLink_tokenHash_key" ON "TelegramAccountLink"("tokenHash");
CREATE INDEX "TelegramAccountLink_userId_botKind_expiresAt_idx" ON "TelegramAccountLink"("userId", "botKind", "expiresAt");
CREATE INDEX "TelegramAccountLink_expiresAt_idx" ON "TelegramAccountLink"("expiresAt");

ALTER TABLE "TelegramAccountLink"
  ADD CONSTRAINT "TelegramAccountLink_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
