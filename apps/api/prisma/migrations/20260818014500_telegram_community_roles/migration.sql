CREATE TABLE "TelegramCommunityRoleAssignment" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunityRoleAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TelegramCommunityRoleAssignment_chatId_telegramUserId_role_key" ON "TelegramCommunityRoleAssignment"("chatId", "telegramUserId", "role");
CREATE INDEX "TelegramCommunityRoleAssignment_chatId_telegramUserId_idx" ON "TelegramCommunityRoleAssignment"("chatId", "telegramUserId");
