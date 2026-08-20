import { Api } from 'teleproto';
import type { TelegramClient } from 'teleproto';
import { prisma } from '../db.js';
import { getSiteConfigMap } from './site-config.service.js';
import { GROUP_HELP_DEFAULT_STAFF_COMMANDS } from './telegram-group-help.commands.js';
import { directoryOptedOutUserIds } from './telegram-group-help.privacy.js';
import {
  type GroupHelpDirectoryMember,
  synchronizeGroupHelpMemberDirectory,
  synchronizeGroupHelpStaffDirectory
} from './telegram-group-help.staff-members.js';

const MEMBER_SYNC_STATE_BOT = 'TELEGRAM_MTPROTO_MEMBER_SYNC';
const DEFAULT_SYNC_HOURS = 6;
const MINIMUM_SYNC_HOURS = 1;
const MAXIMUM_SYNC_HOURS = 168;

type MemberSyncResult = {
  chatId: string;
  scope: 'main' | 'staff';
  active: number;
  departed: number;
  administrators: number;
  skipped?: boolean;
};

function configuredIntervalHours(value: string | undefined) {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return DEFAULT_SYNC_HOURS;
  return Math.min(MAXIMUM_SYNC_HOURS, Math.max(MINIMUM_SYNC_HOURS, Math.round(hours)));
}

function participantIsAdministrator(participant: unknown) {
  const className =
    participant && typeof participant === 'object' && 'className' in participant
      ? String((participant as { className?: string }).className || '')
      : '';
  return /(?:admin|creator|owner)/i.test(className);
}

function entityReference(chatId: string) {
  return /^-?\d+$/.test(chatId) ? Number(chatId) : chatId;
}

async function collectGroupMembers(client: TelegramClient, chatId: string) {
  const members = new Map<string, GroupHelpDirectoryMember>();
  const entity = await client.getInputEntity(entityReference(chatId));
  for await (const user of client.iterParticipants(entity)) {
    const record = user as unknown as {
      id?: string | number | bigint;
      username?: string;
      firstName?: string;
      lastName?: string;
      bot?: boolean;
      participant?: unknown;
    };
    if (record.id == null || record.bot) continue;
    const telegramUserId = String(record.id);
    members.set(telegramUserId, {
      telegramUserId,
      username: record.username || undefined,
      firstName: record.firstName || undefined,
      lastName: record.lastName || undefined,
      isAdministrator: participantIsAdministrator(record.participant)
    });
  }

  // Telegram exposes an explicit admin filter. Use it as the authoritative
  // source because participant metadata can vary between basic groups and
  // supergroups in different MTProto layers.
  try {
    for await (const admin of client.iterParticipants(entity, {
      filter: new Api.ChannelParticipantsAdmins(undefined)
    })) {
      const record = admin as unknown as {
        id?: string | number | bigint;
        username?: string;
        firstName?: string;
        lastName?: string;
        bot?: boolean;
      };
      if (record.id == null || record.bot) continue;
      const telegramUserId = String(record.id);
      const existing = members.get(telegramUserId);
      members.set(telegramUserId, {
        telegramUserId,
        username: record.username || existing?.username,
        firstName: record.firstName || existing?.firstName,
        lastName: record.lastName || existing?.lastName,
        isAdministrator: true
      });
    }
  } catch {
    // Basic groups and restricted participant lists may reject this filter;
    // the participant metadata collected above remains the safe fallback.
  }
  return [...members.values()];
}

async function syncIsDue(chatId: string, force: boolean) {
  if (force) return true;
  const state = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: MEMBER_SYNC_STATE_BOT, chatId } },
    select: { expiresAt: true }
  });
  return !state || state.expiresAt <= new Date();
}

async function recordSuccessfulSync(
  result: MemberSyncResult,
  expiresAt: Date,
  synchronizedAt: Date
) {
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: MEMBER_SYNC_STATE_BOT, chatId: result.chatId } },
    create: {
      bot: MEMBER_SYNC_STATE_BOT,
      chatId: result.chatId,
      state: 'SYNCED',
      payload: {
        scope: result.scope,
        active: result.active,
        departed: result.departed,
        administrators: result.administrators,
        synchronizedAt: synchronizedAt.toISOString()
      },
      expiresAt
    },
    update: {
      state: 'SYNCED',
      payload: {
        scope: result.scope,
        active: result.active,
        departed: result.departed,
        administrators: result.administrators,
        synchronizedAt: synchronizedAt.toISOString()
      },
      expiresAt
    }
  });
}

/**
 * Synchronizes only the configured Hope Hub groups. The connected account must
 * already be a member and must be allowed by Telegram to view participants.
 */
export async function synchronizeConfiguredTelegramGroupMembers(
  client: TelegramClient,
  options: { force?: boolean } = {}
) {
  const values = await getSiteConfigMap([
    'telegramGroupHelpGroupChatId',
    'telegramGroupHelpStaffGroupId',
    'telegramGroupHelpLogChannelId',
    'telegramGroupHelpMemberDirectorySync',
    'telegramGroupHelpMemberSyncHours'
  ]);
  if ((values.telegramGroupHelpMemberDirectorySync || 'on').trim().toLowerCase() === 'off') {
    return [] as MemberSyncResult[];
  }

  const mainGroupId = values.telegramGroupHelpGroupChatId?.trim() || '';
  const staffGroupId = values.telegramGroupHelpStaffGroupId?.trim() || '';
  const configuredGroups = [
    ...(mainGroupId ? [{ scope: 'main' as const, chatId: mainGroupId }] : []),
    ...(staffGroupId && staffGroupId !== mainGroupId
      ? [{ scope: 'staff' as const, chatId: staffGroupId }]
      : [])
  ];
  const intervalHours = configuredIntervalHours(values.telegramGroupHelpMemberSyncHours);
  const synchronizedAt = new Date();
  const expiresAt = new Date(synchronizedAt.getTime() + intervalHours * 60 * 60_000);
  const results: MemberSyncResult[] = [];

  for (const group of configuredGroups) {
    if (!(await syncIsDue(group.chatId, options.force === true))) {
      results.push({
        chatId: group.chatId,
        scope: group.scope,
        active: 0,
        departed: 0,
        administrators: 0,
        skipped: true
      });
      continue;
    }

    const discoveredMembers = await collectGroupMembers(client, group.chatId);
    const optedOut = await directoryOptedOutUserIds(
      group.chatId,
      discoveredMembers.map((member) => member.telegramUserId)
    );
    const members = discoveredMembers.filter((member) => !optedOut.has(member.telegramUserId));
    if (!members.length) {
      throw new Error(
        `Telegram returned no visible members for ${group.scope} group ${group.chatId}; the stored directory was left unchanged.`
      );
    }
    const administrators = members.filter((member) => member.isAdministrator).length;
    const directoryResult =
      group.scope === 'staff'
        ? await synchronizeGroupHelpStaffDirectory({
            staffGroupId: group.chatId,
            mainGroupId,
            members,
            defaultPermissions: GROUP_HELP_DEFAULT_STAFF_COMMANDS,
            logChatId: values.telegramGroupHelpLogChannelId
          })
        : await synchronizeGroupHelpMemberDirectory(group.chatId, members);
    const result: MemberSyncResult = {
      chatId: group.chatId,
      scope: group.scope,
      active: directoryResult.active,
      departed: directoryResult.departed,
      administrators
    };
    await recordSuccessfulSync(result, expiresAt, synchronizedAt);
    results.push(result);
  }
  return results;
}
