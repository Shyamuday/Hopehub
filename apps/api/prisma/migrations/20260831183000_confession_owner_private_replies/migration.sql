BEGIN;

ALTER TABLE "TelegramCommunitySubmission"
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "ownerReplyCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastOwnerReplyAt" TIMESTAMP(3);

COMMIT;
