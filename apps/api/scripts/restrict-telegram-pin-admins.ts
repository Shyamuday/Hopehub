import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Api, TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';
import { getSiteConfigMap } from '../src/services/site-config.service.js';
import { callCommunityTelegramApi } from '../src/services/telegram-community-bots.client.js';
import { GROUP_HELP_BOT_SLUG } from '../src/constants/telegram-community-bot.constants.js';
import {
  canManageGroupHelpPins,
  GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME
} from '../src/services/telegram-group-help.pin-rights.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const APPLY = process.argv.includes('--apply');

type AdminRights = {
  changeInfo?: boolean;
  postMessages?: boolean;
  editMessages?: boolean;
  deleteMessages?: boolean;
  banUsers?: boolean;
  inviteUsers?: boolean;
  pinMessages?: boolean;
  addAdmins?: boolean;
  anonymous?: boolean;
  manageCall?: boolean;
  other?: boolean;
  manageTopics?: boolean;
  postStories?: boolean;
  editStories?: boolean;
  deleteStories?: boolean;
  manageDirectMessages?: boolean;
  manageRanks?: boolean;
  manageLinkedPeers?: boolean;
};

type AdminRecord = {
  id: string | number | bigint;
  username?: string;
  bot?: boolean;
  participant?: {
    className?: string;
    adminRights?: AdminRights;
    rank?: string;
  };
};

type BotAdministrator = {
  status?: string;
  user: { id: number; username?: string; is_bot?: boolean };
  can_pin_messages?: boolean;
};

const secret = (environmentName: string, fileName: string) =>
  process.env[environmentName]?.trim() || readFileSync(`/etc/${fileName}`, 'utf8').trim();
const normalizeUsername = (value: string | undefined) =>
  value?.trim().replace(/^@/, '').toLowerCase() || '';

function editAdminParams(rights: AdminRights, pinMessages: boolean, rank?: string) {
  return {
    changeInfo: rights.changeInfo === true,
    postMessages: rights.postMessages === true,
    editMessages: rights.editMessages === true,
    deleteMessages: rights.deleteMessages === true,
    banUsers: rights.banUsers === true,
    inviteUsers: rights.inviteUsers === true,
    pinMessages,
    addAdmins: rights.addAdmins === true,
    anonymous: rights.anonymous === true,
    manageCall: rights.manageCall === true,
    other: rights.other === true,
    manageTopics: rights.manageTopics === true,
    postStories: rights.postStories === true,
    editStories: rights.editStories === true,
    deleteStories: rights.deleteStories === true,
    manageDirectMessages: rights.manageDirectMessages === true,
    manageRanks: rights.manageRanks === true,
    manageLinkedPeers: rights.manageLinkedPeers === true,
    ...(rank ? { rank } : {})
  };
}

async function administrators(
  client: TelegramClient,
  entity: Awaited<ReturnType<TelegramClient['getInputEntity']>>
) {
  const result: AdminRecord[] = [];
  for await (const user of client.iterParticipants(entity, {
    filter: new Api.ChannelParticipantsAdmins(undefined)
  })) {
    result.push(user as unknown as AdminRecord);
  }
  return result;
}

function isOwner(admin: AdminRecord, botAdministrators: Map<string, BotAdministrator>) {
  const botStatus = botAdministrators.get(String(admin.id))?.status || '';
  return (
    /(?:creator|owner)/i.test(admin.participant?.className || '') ||
    ['creator', 'owner'].includes(botStatus.toLowerCase())
  );
}

function usernameFor(admin: AdminRecord, botAdministrators: Map<string, BotAdministrator>) {
  return botAdministrators.get(String(admin.id))?.user.username || admin.username;
}

async function main() {
  const values = await getSiteConfigMap(['telegramGroupHelpGroupChatId']);
  const chatId = values.telegramGroupHelpGroupChatId?.trim();
  if (!chatId) throw new Error('The Hope Hub main Telegram group is not configured.');

  const apiId = Number(secret('TELEGRAM_USER_API_ID', 'hopehub-telegram-user-api-id'));
  const apiHash = secret('TELEGRAM_USER_API_HASH', 'hopehub-telegram-user-api-hash');
  const session =
    process.env.TELEGRAM_USER_SESSION?.trim() || readFileSync(SESSION_PATH, 'utf8').trim();
  if (!Number.isInteger(apiId) || !apiHash || !session) {
    throw new Error('The Telegram owner session is incomplete.');
  }

  const [serviceBot, botAdministratorList] = await Promise.all([
    callCommunityTelegramApi<{ id: number }>(GROUP_HELP_BOT_SLUG, 'getMe', {}),
    callCommunityTelegramApi<BotAdministrator[]>(GROUP_HELP_BOT_SLUG, 'getChatAdministrators', {
      chat_id: chatId
    })
  ]);
  const botAdministrators = new Map(
    botAdministratorList.map((administrator) => [String(administrator.user.id), administrator])
  );
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5
  });
  await client.connect();
  try {
    const entity = await client.getInputEntity(/^[-]?\d+$/.test(chatId) ? Number(chatId) : chatId);
    const current = await administrators(client, entity);
    const ownerCount = current.filter((admin) => isOwner(admin, botAdministrators)).length;
    const exclusiveAdmins = botAdministratorList.filter(
      (admin) =>
        normalizeUsername(admin.user.username) === GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME &&
        !['creator', 'owner'].includes(admin.status?.toLowerCase() || '')
    );
    if (ownerCount < 1) throw new Error('The group owner was not found in the administrator list.');
    if (exclusiveAdmins.length !== 1) {
      throw new Error(
        `Expected exactly one @${GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME} administrator; found ${exclusiveAdmins.length}.`
      );
    }
    const changes = current.filter((admin) => {
      if (isOwner(admin, botAdministrators) || String(admin.id) === String(serviceBot.id))
        return false;
      const desired = canManageGroupHelpPins({
        status: 'administrator',
        username: usernameFor(admin, botAdministrators)
      });
      const currentPinRight =
        botAdministrators.get(String(admin.id))?.can_pin_messages ??
        admin.participant?.adminRights?.pinMessages;
      return Boolean(currentPinRight) !== desired;
    });
    console.log(
      JSON.stringify({
        apply: APPLY,
        administrators: current.length,
        owners: ownerCount,
        exclusivePinAdministrators: exclusiveAdmins.length,
        rightsToChange: changes.length,
        serviceBotExcluded: current.some((admin) => String(admin.id) === String(serviceBot.id))
      })
    );
    if (!APPLY) return;

    for (const admin of changes) {
      const desired = canManageGroupHelpPins({
        status: 'administrator',
        username: usernameFor(admin, botAdministrators)
      });
      await client.editAdmin(
        entity,
        admin as never,
        editAdminParams(admin.participant?.adminRights || {}, desired, admin.participant?.rank)
      );
    }

    const verified = await callCommunityTelegramApi<BotAdministrator[]>(
      GROUP_HELP_BOT_SLUG,
      'getChatAdministrators',
      { chat_id: chatId }
    );
    const violations = verified.filter((admin) => {
      if (
        ['creator', 'owner'].includes(admin.status?.toLowerCase() || '') ||
        String(admin.user.id) === String(serviceBot.id)
      )
        return false;
      const expected = canManageGroupHelpPins({
        status: 'administrator',
        username: admin.user.username
      });
      return Boolean(admin.can_pin_messages) !== expected;
    });
    if (violations.length) {
      throw new Error(
        `Telegram pin-right verification failed for ${violations.length} administrator(s).`
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
  } finally {
    await client.disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
