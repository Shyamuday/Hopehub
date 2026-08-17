CREATE TABLE "TelegramCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bot" TEXT NOT NULL DEFAULT 'rules',
    "chatId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "intervalMinutes" INTEGER NOT NULL,
    "repeat" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "currentItemIndex" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramCampaignItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "imageUrl" TEXT,
    "pollQuestion" TEXT,
    "pollOptions" JSONB,
    "pollAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "pollMultiple" BOOLEAN NOT NULL DEFAULT false,
    "pollQuiz" BOOLEAN NOT NULL DEFAULT false,
    "correctOptionIds" JSONB,
    "pollExplanation" TEXT,
    "closeAfterMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCampaignItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramCampaignDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "itemId" TEXT,
    "telegramMessageId" INTEGER,
    "telegramPollId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "pollSnapshot" JSONB,
    "totalVoterCount" INTEGER NOT NULL DEFAULT 0,
    "closesAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCampaignDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramPollVote" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "optionIds" JSONB NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramPollVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelegramCampaign_isActive_nextRunAt_idx" ON "TelegramCampaign"("isActive", "nextRunAt");
CREATE INDEX "TelegramCampaign_chatId_idx" ON "TelegramCampaign"("chatId");
CREATE UNIQUE INDEX "TelegramCampaignItem_campaignId_sortOrder_key" ON "TelegramCampaignItem"("campaignId", "sortOrder");
CREATE INDEX "TelegramCampaignItem_campaignId_idx" ON "TelegramCampaignItem"("campaignId");
CREATE UNIQUE INDEX "TelegramCampaignDelivery_telegramPollId_key" ON "TelegramCampaignDelivery"("telegramPollId");
CREATE INDEX "TelegramCampaignDelivery_campaignId_createdAt_idx" ON "TelegramCampaignDelivery"("campaignId", "createdAt");
CREATE INDEX "TelegramCampaignDelivery_status_closesAt_idx" ON "TelegramCampaignDelivery"("status", "closesAt");
CREATE UNIQUE INDEX "TelegramPollVote_deliveryId_telegramUserId_key" ON "TelegramPollVote"("deliveryId", "telegramUserId");
CREATE INDEX "TelegramPollVote_deliveryId_idx" ON "TelegramPollVote"("deliveryId");

ALTER TABLE "TelegramCampaignItem" ADD CONSTRAINT "TelegramCampaignItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TelegramCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramCampaignDelivery" ADD CONSTRAINT "TelegramCampaignDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TelegramCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramCampaignDelivery" ADD CONSTRAINT "TelegramCampaignDelivery_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TelegramCampaignItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TelegramPollVote" ADD CONSTRAINT "TelegramPollVote_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "TelegramCampaignDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramCampaignItem" ADD COLUMN "messageThreadId" INTEGER,
ADD COLUMN "followUpOptionIds" JSONB,
ADD COLUMN "followUpMessage" TEXT;

ALTER TABLE "TelegramPollVote" ADD COLUMN "followUpSentAt" TIMESTAMP(3),
ADD COLUMN "followUpError" TEXT;

CREATE TABLE "TelegramCommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "chatId" TEXT NOT NULL,
    "joinUrl" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "telegramMessageId" INTEGER,
    "announcedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCommunityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramCommunityEventRsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCommunityEventRsvp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramCommunityReaction" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "reactions" JSONB NOT NULL,
    "reactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCommunityReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramCommunityMember" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "welcomeSentAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramCommunityMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelegramCommunityEvent_status_startsAt_idx" ON "TelegramCommunityEvent"("status", "startsAt");
CREATE INDEX "TelegramCommunityEvent_chatId_idx" ON "TelegramCommunityEvent"("chatId");
CREATE UNIQUE INDEX "TelegramCommunityEventRsvp_eventId_telegramUserId_key" ON "TelegramCommunityEventRsvp"("eventId", "telegramUserId");
CREATE INDEX "TelegramCommunityEventRsvp_eventId_status_idx" ON "TelegramCommunityEventRsvp"("eventId", "status");
CREATE UNIQUE INDEX "TelegramCommunityReaction_chatId_messageId_telegramUserId_key" ON "TelegramCommunityReaction"("chatId", "messageId", "telegramUserId");
CREATE INDEX "TelegramCommunityReaction_chatId_reactedAt_idx" ON "TelegramCommunityReaction"("chatId", "reactedAt");
CREATE INDEX "TelegramCommunityReaction_messageId_idx" ON "TelegramCommunityReaction"("messageId");
CREATE UNIQUE INDEX "TelegramCommunityMember_chatId_telegramUserId_key" ON "TelegramCommunityMember"("chatId", "telegramUserId");
CREATE INDEX "TelegramCommunityMember_chatId_joinedAt_idx" ON "TelegramCommunityMember"("chatId", "joinedAt");

ALTER TABLE "TelegramCommunityEventRsvp" ADD CONSTRAINT "TelegramCommunityEventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TelegramCommunityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
