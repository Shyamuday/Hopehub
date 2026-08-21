import { prisma } from '../db.js';
import {
  GROUP_HELP_BOT_SLUG,
  isGroupHelpAutomaticFullAdminUsername
} from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type {
  CommunityTelegramUpdate,
  CommunityTelegramUser
} from './telegram-community-bots.types.js';
import {
  changedTelegramIdentityFields,
  normalizedTelegramIdentity,
  observeTelegramCommunityMember,
  telegramDisplayName
} from './telegram-community-member-identity.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';
const AUTOMATIC_ROLE_ACTOR = 'telegram-private-staff-auto';
const STAFF_STATUS_TTL_MS = 6 * 60 * 60_000;
const staffStatusCache = new Map<string, { status: string; expiresAt: number }>();

export type GroupHelpDirectoryMember = {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isAdministrator?: boolean;
};

async function staffMembershipStatus(
  staffGroupId: string,
  telegramUserId: string,
  knownStatus?: string
) {
  const cacheKey = `${staffGroupId}:${telegramUserId}`;
  if (knownStatus) {
    staffStatusCache.set(cacheKey, {
      status: knownStatus,
      expiresAt: Date.now() + STAFF_STATUS_TTL_MS
    });
    return knownStatus;
  }
  const cached = staffStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.status;
  const status =
    (
      await callCommunityTelegramApi<{ status?: string }>(GROUP_HELP_BOT_SLUG, 'getChatMember', {
        chat_id: staffGroupId,
        user_id: Number(telegramUserId)
      }).catch(() => null)
    )?.status || '';
  if (status) {
    staffStatusCache.set(cacheKey, { status, expiresAt: Date.now() + STAFF_STATUS_TTL_MS });
  }
  return status;
}

async function ensureDailyStaffPermissions(
  mainGroupId: string,
  staffGroupId: string,
  telegramUserId: string,
  username: string | undefined,
  defaultPermissions: readonly string[],
  knownStatus?: string
) {
  if (!mainGroupId) return false;
  const trustedUsername = isGroupHelpAutomaticFullAdminUsername(username);
  const existing = await prisma.telegramCommunityRoleAssignment.findFirst({
    where: { chatId: mainGroupId, telegramUserId },
    include: { customRole: { select: { id: true, permissions: true, createdById: true } } }
  });
  const existingPermissions = existing?.customRole?.permissions;
  const membershipStatus = await staffMembershipStatus(staffGroupId, telegramUserId, knownStatus);
  const fullAdmin =
    trustedUsername ||
    ['administrator', 'creator', 'owner'].includes(membershipStatus.toLowerCase());
  if (
    existing?.customRole?.createdById !== undefined &&
    existing.customRole.createdById !== AUTOMATIC_ROLE_ACTOR
  ) {
    return false;
  }
  if (existing && Array.isArray(existingPermissions) && existingPermissions.includes('*')) {
    // Explicit admin-panel grants remain explicit. Automatically granted full
    // access follows the person's current Telegram administrator status.
    if (existing.customRole?.createdById !== AUTOMATIC_ROLE_ACTOR || fullAdmin) return false;
    await prisma.telegramCommunityCustomRole.update({
      where: { id: existing.customRole.id },
      data: { permissions: [...defaultPermissions], createdById: AUTOMATIC_ROLE_ACTOR }
    });
    return 'DAILY';
  }
  if (existing && !fullAdmin) return false;
  const permissions = fullAdmin ? ['*'] : [...defaultPermissions];
  const role = await prisma.telegramCommunityCustomRole.upsert({
    where: { chatId_name: { chatId: mainGroupId, name: `HH staff ${telegramUserId}` } },
    create: {
      chatId: mainGroupId,
      name: `HH staff ${telegramUserId}`,
      permissions,
      createdById: AUTOMATIC_ROLE_ACTOR
    },
    update: fullAdmin ? { permissions: ['*'], createdById: AUTOMATIC_ROLE_ACTOR } : {}
  });
  await prisma.$transaction([
    prisma.telegramCommunityRoleAssignment.deleteMany({
      where: { chatId: mainGroupId, telegramUserId }
    }),
    prisma.telegramCommunityRoleAssignment.create({
      data: {
        chatId: mainGroupId,
        telegramUserId,
        role: 'CUSTOM',
        customRoleId: role.id,
        assignedById: AUTOMATIC_ROLE_ACTOR
      }
    })
  ]);
  return fullAdmin ? 'FULL_ADMIN' : 'DAILY';
}

async function sendStaffAccessLog(logChatId: string, lines: string[]) {
  if (!logChatId) return;
  await sendCommunityMessage(GROUP_HELP_BOT_SLUG, logChatId, lines.join('\n')).catch(() => null);
}

async function upsertActiveMember(
  chatId: string,
  mainGroupId: string,
  member: CommunityTelegramUser,
  defaultPermissions: readonly string[],
  logChatId: string,
  knownStatus?: string
) {
  if (member.is_bot) return;
  await observeTelegramCommunityMember({
    chatId,
    member,
    source: 'STAFF_GROUP'
  });
  const granted = await ensureDailyStaffPermissions(
    mainGroupId,
    chatId,
    String(member.id),
    member.username,
    defaultPermissions,
    knownStatus
  );
  if (granted) {
    await sendStaffAccessLog(logChatId, [
      'Private staff access granted',
      `Member: ${telegramPersonLogLabel(member)}`,
      `Access: ${granted === 'FULL_ADMIN' ? 'full bot administrator' : 'daily moderation permissions'}`,
      `Main group: ${mainGroupId}`
    ]);
  }
}

/** Tracks staff as Telegram reveals them through joins, membership updates, and messages. */
export async function recordGroupHelpStaffGroupMember(
  update: CommunityTelegramUpdate,
  configuredStaffGroupId: string,
  configuredMainGroupId: string,
  defaultPermissions: readonly string[],
  configuredLogChatId: string
) {
  const staffGroupId = configuredStaffGroupId.trim();
  const mainGroupId = configuredMainGroupId.trim();
  const logChatId = configuredLogChatId.trim();
  if (!staffGroupId) return false;
  const message = update.message || update.channel_post;
  const membership = update.chat_member;
  const chat = message?.chat || membership?.chat;
  if (!chat || String(chat.id) !== staffGroupId) return false;

  if (membership) {
    const member = membership.new_chat_member.user;
    if (['left', 'kicked'].includes(membership.new_chat_member.status)) {
      await prisma.telegramCommunityMember.updateMany({
        where: { chatId: staffGroupId, telegramUserId: String(member.id) },
        data: { leftAt: new Date() }
      });
      await sendStaffAccessLog(logChatId, [
        'Private staff access revoked',
        `Member: ${telegramPersonLogLabel(member)}`,
        'Reason: member left or was removed from the private staff group.',
        `Main group: ${mainGroupId}`
      ]);
    } else {
      await upsertActiveMember(
        staffGroupId,
        mainGroupId,
        member,
        defaultPermissions,
        logChatId,
        membership.new_chat_member.status
      );
    }
  }
  for (const member of message?.new_chat_members || [])
    await upsertActiveMember(staffGroupId, mainGroupId, member, defaultPermissions, logChatId);
  if (message?.left_chat_member && !message.left_chat_member.is_bot) {
    await prisma.telegramCommunityMember.updateMany({
      where: { chatId: staffGroupId, telegramUserId: String(message.left_chat_member.id) },
      data: { leftAt: new Date() }
    });
    await sendStaffAccessLog(logChatId, [
      'Private staff access revoked',
      `Member: ${telegramPersonLogLabel(message.left_chat_member)}`,
      'Reason: member left or was removed from the private staff group.',
      `Main group: ${mainGroupId}`
    ]);
  }
  if (message?.from && !message.from.is_bot)
    await upsertActiveMember(
      staffGroupId,
      mainGroupId,
      message.from,
      defaultPermissions,
      logChatId
    );
  return true;
}

export async function isActiveGroupHelpStaffMember(chatId: string, telegramUserId: string) {
  return Boolean(
    await prisma.telegramCommunityMember.findFirst({
      where: { chatId, telegramUserId, leftAt: null },
      select: { id: true }
    })
  );
}

async function upsertDirectoryMembers(
  chatId: string,
  members: readonly GroupHelpDirectoryMember[]
) {
  const activeBefore = await prisma.telegramCommunityMember.findMany({
    where: { chatId, leftAt: null },
    select: { telegramUserId: true }
  });
  const activeIds = new Set(members.map((member) => member.telegramUserId));
  const memberIds = [...activeIds];
  const [existingMembers, historicalMembers] = await Promise.all([
    prisma.telegramCommunityMember.findMany({
      where: { chatId, telegramUserId: { in: memberIds } },
      select: { telegramUserId: true, firstName: true, lastName: true, username: true }
    }),
    prisma.telegramCommunityMemberIdentityHistory.findMany({
      where: { chatId, telegramUserId: { in: memberIds } },
      distinct: ['telegramUserId'],
      select: { telegramUserId: true }
    })
  ]);
  const existingByMemberId = new Map(
    existingMembers.map((member) => [member.telegramUserId, member])
  );
  const historyMemberIds = new Set(historicalMembers.map((member) => member.telegramUserId));

  for (let offset = 0; offset < members.length; offset += 100) {
    const chunk = members.slice(offset, offset + 100);
    await prisma.$transaction(
      chunk.flatMap((member) => {
        const previous = existingByMemberId.get(member.telegramUserId);
        const next = normalizedTelegramIdentity(member);
        const changedFields = previous
          ? changedTelegramIdentityFields(previous, next)
          : ['initial'];
        const shouldRecord =
          !previous || !historyMemberIds.has(member.telegramUserId) || changedFields.length > 0;
        const identityInitial = !previous || !historyMemberIds.has(member.telegramUserId);
        return [
          prisma.telegramCommunityMember.upsert({
            where: {
              chatId_telegramUserId: { chatId, telegramUserId: member.telegramUserId }
            },
            create: { chatId, telegramUserId: member.telegramUserId, ...next },
            update: { ...next, leftAt: null }
          }),
          ...(shouldRecord
            ? [
                prisma.telegramCommunityMemberIdentityHistory.create({
                  data: {
                    chatId,
                    telegramUserId: member.telegramUserId,
                    previousFirstName: identityInitial ? null : previous?.firstName,
                    previousLastName: identityInitial ? null : previous?.lastName,
                    previousUsername: identityInitial ? null : previous?.username,
                    previousDisplayName: identityInitial ? null : telegramDisplayName(previous!),
                    firstName: next.firstName,
                    lastName: next.lastName,
                    username: next.username,
                    displayName: telegramDisplayName(next),
                    changedFields: identityInitial ? ['initial'] : changedFields,
                    source: 'DIRECTORY_SYNC'
                  }
                })
              ]
            : [])
        ];
      })
    );
  }

  const departedIds = activeBefore
    .map((member) => member.telegramUserId)
    .filter((telegramUserId) => !activeIds.has(telegramUserId));
  for (let offset = 0; offset < departedIds.length; offset += 500) {
    await prisma.telegramCommunityMember.updateMany({
      where: { chatId, telegramUserId: { in: departedIds.slice(offset, offset + 500) } },
      data: { leftAt: new Date() }
    });
  }

  return { active: members.length, departed: departedIds.length };
}

/** Reconciles a complete MTProto member snapshot with the stored group directory. */
export async function synchronizeGroupHelpMemberDirectory(
  chatId: string,
  members: readonly GroupHelpDirectoryMember[]
) {
  return upsertDirectoryMembers(chatId, members);
}

/**
 * Reconciles the private staff group and grants safe defaults. Telegram
 * administrators/owners receive full bot access; ordinary staff receive only
 * the configured daily command set and can be adjusted from the admin panel.
 */
export async function synchronizeGroupHelpStaffDirectory(input: {
  staffGroupId: string;
  mainGroupId: string;
  members: readonly GroupHelpDirectoryMember[];
  defaultPermissions: readonly string[];
  logChatId?: string;
}) {
  const result = await upsertDirectoryMembers(input.staffGroupId, input.members);
  let fullAdministrators = 0;
  let defaultStaff = 0;
  for (const member of input.members) {
    const granted = await ensureDailyStaffPermissions(
      input.mainGroupId,
      input.staffGroupId,
      member.telegramUserId,
      member.username,
      input.defaultPermissions,
      member.isAdministrator ? 'administrator' : 'member'
    );
    if (granted === 'FULL_ADMIN') fullAdministrators += 1;
    if (granted === 'DAILY') defaultStaff += 1;
  }
  await sendStaffAccessLog(input.logChatId?.trim() || '', [
    'Private staff directory synchronized',
    `Active members: ${result.active}`,
    `Departed since last sync: ${result.departed}`,
    `New full administrators: ${fullAdministrators}`,
    `New daily-access staff: ${defaultStaff}`,
    `Main group: ${input.mainGroupId}`
  ]);
  return { ...result, fullAdministrators, defaultStaff };
}
