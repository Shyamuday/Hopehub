import 'dotenv/config';
import { prisma } from '../src/db.js';
import { getSiteConfigMap } from '../src/services/site-config.service.js';
import { callCommunityTelegramApi } from '../src/services/telegram-community-bots.client.js';
import { GROUP_HELP_BOT_SLUG } from '../src/constants/telegram-community-bot.constants.js';
import {
  canManageGroupHelpPins,
  GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME,
  isExclusiveGroupHelpPinAdminUsername
} from '../src/services/telegram-group-help.pin-rights.js';

const APPLY = process.argv.includes('--apply');

type BotAdministrator = {
  status?: string;
  user: { id: number; username?: string; is_bot?: boolean };
  is_anonymous?: boolean;
  custom_title?: string;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_stories?: boolean;
  can_edit_stories?: boolean;
  can_delete_stories?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  can_manage_tags?: boolean;
  can_send_welcome_messages?: boolean;
};

function isOwner(admin: BotAdministrator) {
  return ['creator', 'owner'].includes(admin.status?.toLowerCase() || '');
}

function desiredPinRight(admin: BotAdministrator) {
  return canManageGroupHelpPins({
    status: admin.status,
    username: admin.user.username
  });
}

function preservedAdministratorRights(admin: BotAdministrator, canPinMessages: boolean) {
  return {
    is_anonymous: admin.is_anonymous === true,
    can_manage_chat: admin.can_manage_chat === true,
    can_delete_messages: admin.can_delete_messages === true,
    can_manage_video_chats: admin.can_manage_video_chats === true,
    can_restrict_members: admin.can_restrict_members === true,
    can_promote_members: admin.can_promote_members === true,
    can_change_info: admin.can_change_info === true,
    can_invite_users: admin.can_invite_users === true,
    can_post_stories: admin.can_post_stories === true,
    can_edit_stories: admin.can_edit_stories === true,
    can_delete_stories: admin.can_delete_stories === true,
    can_pin_messages: canPinMessages,
    can_manage_topics: admin.can_manage_topics === true,
    can_manage_tags: admin.can_manage_tags === true,
    can_send_welcome_messages: admin.can_send_welcome_messages === true
  };
}

async function main() {
  const values = await getSiteConfigMap(['telegramGroupHelpGroupChatId']);
  const chatId = values.telegramGroupHelpGroupChatId?.trim();
  if (!chatId) throw new Error('The Hope Hub main Telegram group is not configured.');

  const [serviceBot, administrators] = await Promise.all([
    callCommunityTelegramApi<{ id: number }>(GROUP_HELP_BOT_SLUG, 'getMe', {}),
    callCommunityTelegramApi<BotAdministrator[]>(GROUP_HELP_BOT_SLUG, 'getChatAdministrators', {
      chat_id: chatId
    })
  ]);
  const effectiveServiceMembership = administrators.find(
    (admin) => admin.user.id === serviceBot.id
  );
  if (!effectiveServiceMembership?.can_promote_members) {
    throw new Error('The Hope Hub bot does not have permission to edit administrator rights.');
  }

  const ownerCount = administrators.filter(isOwner).length;
  const exclusiveAdmins = administrators.filter(
    (admin) => isExclusiveGroupHelpPinAdminUsername(admin.user.username) && !isOwner(admin)
  );
  if (ownerCount < 1) throw new Error('The group owner was not found in the administrator list.');
  if (exclusiveAdmins.length !== 1) {
    throw new Error(
      `Expected exactly one @${GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME} Mindcraft administrator; found ${exclusiveAdmins.length}.`
    );
  }

  const changes = administrators.filter(
    (admin) =>
      !isOwner(admin) &&
      admin.user.id !== serviceBot.id &&
      Boolean(admin.can_pin_messages) !== desiredPinRight(admin)
  );
  console.log(
    JSON.stringify({
      apply: APPLY,
      administrators: administrators.length,
      owners: ownerCount,
      exclusivePinAdministrators: exclusiveAdmins.length,
      rightsToChange: changes.length,
      serviceBotExcluded: administrators.some((admin) => admin.user.id === serviceBot.id)
    })
  );
  if (!APPLY) return;

  const editFailures: string[] = [];
  for (const admin of changes) {
    try {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'promoteChatMember', {
        chat_id: chatId,
        user_id: admin.user.id,
        ...preservedAdministratorRights(admin, desiredPinRight(admin))
      });
    } catch {
      editFailures.push(String(admin.user.id));
    }
  }

  const verified = await callCommunityTelegramApi<BotAdministrator[]>(
    GROUP_HELP_BOT_SLUG,
    'getChatAdministrators',
    { chat_id: chatId }
  );
  const violations = verified.filter(
    (admin) =>
      !isOwner(admin) &&
      admin.user.id !== serviceBot.id &&
      Boolean(admin.can_pin_messages) !== desiredPinRight(admin)
  );
  if (violations.length || editFailures.length) {
    throw new Error(
      `Telegram pin-right verification failed: ${violations.length} violation(s), ${editFailures.length} edit failure(s).`
    );
  }
  console.log(
    JSON.stringify({
      applied: true,
      changed: changes.length,
      verifiedAdministrators: verified.length,
      violations: 0
    })
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
