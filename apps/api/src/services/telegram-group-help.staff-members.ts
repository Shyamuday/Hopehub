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
const AUTOMATIC_ROLE_ACTOR = 'telegram-private-staff-auto';
const STAFF_STATUS_TTL_MS = 6 * 60 * 60_000;
const staffStatusCache = new Map<string, { status: string; expiresAt: number }>();

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
    include: { customRole: { select: { permissions: true } } }
  });
  const existingPermissions = existing?.customRole?.permissions;
  if (existing && Array.isArray(existingPermissions) && existingPermissions.includes('*')) {
    return false;
  }
  const membershipStatus = await staffMembershipStatus(staffGroupId, telegramUserId, knownStatus);
  const fullAdmin =
    trustedUsername || ['creator', 'owner'].includes(membershipStatus.toLowerCase());
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
  await prisma.telegramCommunityMember.upsert({
    where: { chatId_telegramUserId: { chatId, telegramUserId: String(member.id) } },
    create: {
      chatId,
      telegramUserId: String(member.id),
      username: member.username,
      firstName: member.first_name,
      lastName: member.last_name
    },
    update: {
      username: member.username,
      firstName: member.first_name,
      lastName: member.last_name,
      leftAt: null
    }
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
      `Member: ${member.first_name || 'Telegram member'}${member.username ? ` (@${member.username})` : ''} [${member.id}]`,
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
        `Member: ${member.first_name || 'Telegram member'}${member.username ? ` (@${member.username})` : ''} [${member.id}]`,
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
      `Member: ${message.left_chat_member.first_name || 'Telegram member'}${message.left_chat_member.username ? ` (@${message.left_chat_member.username})` : ''} [${message.left_chat_member.id}]`,
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
