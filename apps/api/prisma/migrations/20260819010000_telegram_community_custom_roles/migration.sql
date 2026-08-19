CREATE TABLE "TelegramCommunityCustomRole" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "permissions" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramCommunityCustomRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramCommunityCustomRole_chatId_name_key"
  ON "TelegramCommunityCustomRole"("chatId", "name");
CREATE INDEX "TelegramCommunityCustomRole_chatId_idx"
  ON "TelegramCommunityCustomRole"("chatId");

ALTER TABLE "TelegramCommunityRoleAssignment" ADD COLUMN "customRoleId" TEXT;
CREATE INDEX "TelegramCommunityRoleAssignment_customRoleId_idx"
  ON "TelegramCommunityRoleAssignment"("customRoleId");
ALTER TABLE "TelegramCommunityRoleAssignment"
  ADD CONSTRAINT "TelegramCommunityRoleAssignment_customRoleId_fkey"
  FOREIGN KEY ("customRoleId") REFERENCES "TelegramCommunityCustomRole"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
