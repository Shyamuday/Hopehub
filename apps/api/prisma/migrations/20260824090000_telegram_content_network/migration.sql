CREATE TABLE "TelegramContentChannel" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "bot" TEXT NOT NULL DEFAULT 'hopehubai',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "requireApproval" BOOLEAN NOT NULL DEFAULT true,
  "minimumPostGapMinutes" INTEGER NOT NULL DEFAULT 120,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramContentChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramContentChannel_slug_key" ON "TelegramContentChannel"("slug");
CREATE UNIQUE INDEX "TelegramContentChannel_chatId_key" ON "TelegramContentChannel"("chatId");
CREATE INDEX "TelegramContentChannel_isActive_idx" ON "TelegramContentChannel"("isActive");
CREATE INDEX "TelegramContentChannel_category_idx" ON "TelegramContentChannel"("category");

CREATE TABLE "TelegramContentSource" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "feedUrl" TEXT NOT NULL,
  "attribution" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoApprove" BOOLEAN NOT NULL DEFAULT false,
  "fetchIntervalMinutes" INTEGER NOT NULL DEFAULT 180,
  "nextFetchAt" TIMESTAMP(3),
  "lastFetchedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramContentSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramContentSource_channelId_feedUrl_key" ON "TelegramContentSource"("channelId", "feedUrl");
CREATE INDEX "TelegramContentSource_isActive_nextFetchAt_idx" ON "TelegramContentSource"("isActive", "nextFetchAt");
CREATE INDEX "TelegramContentSource_channelId_idx" ON "TelegramContentSource"("channelId");

CREATE TABLE "TelegramContentItem" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "sourceId" TEXT,
  "contentKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "postText" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "imageUrl" TEXT,
  "publishedSourceAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "telegramMessageId" INTEGER,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramContentItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramContentItem_contentKey_key" ON "TelegramContentItem"("contentKey");
CREATE INDEX "TelegramContentItem_channelId_status_scheduledFor_idx" ON "TelegramContentItem"("channelId", "status", "scheduledFor");
CREATE INDEX "TelegramContentItem_sourceId_createdAt_idx" ON "TelegramContentItem"("sourceId", "createdAt");
CREATE INDEX "TelegramContentItem_status_updatedAt_idx" ON "TelegramContentItem"("status", "updatedAt");

ALTER TABLE "TelegramContentSource" ADD CONSTRAINT "TelegramContentSource_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "TelegramContentChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramContentItem" ADD CONSTRAINT "TelegramContentItem_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "TelegramContentChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramContentItem" ADD CONSTRAINT "TelegramContentItem_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "TelegramContentSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
