ALTER TABLE "TelegramCommunityEvent" ADD COLUMN "announcementDueAt" TIMESTAMP(3);

CREATE INDEX "TelegramCommunityEvent_status_announcementDueAt_idx"
ON "TelegramCommunityEvent"("status", "announcementDueAt");
