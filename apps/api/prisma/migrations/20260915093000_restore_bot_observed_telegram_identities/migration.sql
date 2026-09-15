BEGIN;

-- MTProto directory snapshots can contain the connected account's private
-- contact label. Restore the latest identity observed directly through Bot
-- API activity before directory sync becomes membership-only.
WITH latest_bot_identity AS (
  SELECT DISTINCT ON ("chatId", "telegramUserId")
    "chatId",
    "telegramUserId",
    "firstName",
    "lastName",
    username
  FROM "TelegramCommunityMemberIdentityHistory"
  WHERE source <> 'DIRECTORY_SYNC'
  ORDER BY "chatId", "telegramUserId", "observedAt" DESC, "createdAt" DESC
)
UPDATE "TelegramCommunityMember" AS member
SET
  "firstName" = identity."firstName",
  "lastName" = identity."lastName",
  username = identity.username,
  "updatedAt" = NOW()
FROM latest_bot_identity AS identity
WHERE member."chatId" = identity."chatId"
  AND member."telegramUserId" = identity."telegramUserId"
  AND (
    member."firstName" IS DISTINCT FROM identity."firstName"
    OR member."lastName" IS DISTINCT FROM identity."lastName"
    OR member.username IS DISTINCT FROM identity.username
  );

COMMIT;
