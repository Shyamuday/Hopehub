import { prisma } from '../db.js';
import {
  GROUP_HELP_AUTOMATIC_FULL_ADMIN_USERNAMES,
  GROUP_HELP_BOT_SLUG
} from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { recordGroupHelpCommandAudit } from './telegram-group-help.command-audit.js';
import { isActiveGroupHelpStaffMember } from './telegram-group-help.staff-members.js';

const adminStatusCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();
const ADMIN_STATUS_TTL_MS = 5 * 60 * 1000;

export function telegramAdminWhitelist(value: string) {
  return new Set(
    value
      .split(/[\n,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function isModerationExempt(
  message: CommunityTelegramMessage,
  whitelistValue: string
) {
  if (message._groupHelpRequiresActiveStaff) {
    if (
      !message.from ||
      !message._groupHelpControlSourceChatId ||
      !(await isActiveGroupHelpStaffMember(
        message._groupHelpControlSourceChatId,
        String(message.from.id)
      ))
    ) {
      return false;
    }
  }
  if (message.sender_chat && String(message.sender_chat.id) === String(message.chat.id))
    return true;
  if (!message.from) return false;
  const whitelist = telegramAdminWhitelist(whitelistValue);
  const userId = String(message.from.id);
  const username = message.from.username?.trim().toLowerCase();
  if (whitelist.has(userId) || (username && whitelist.has(`@${username}`))) return true;
  const chatId = String(message.chat.id);
  const cacheKey = `${chatId}:${userId}`;
  const cached = adminStatusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.isAdmin;
  const membership = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    {
      chat_id: chatId,
      user_id: message.from.id
    }
  ).catch(() => undefined);
  // A Telegram lookup failure must never grant moderation access. Explicitly
  // whitelisted administrators already returned above; everyone else retries
  // once Telegram is reachable again.
  if (!membership) return false;
  const isAdmin = ['creator', 'administrator'].includes(membership.status || '');
  adminStatusCache.set(cacheKey, { isAdmin, expiresAt: Date.now() + ADMIN_STATUS_TTL_MS });
  return isAdmin;
}

export async function sendGroupHelpPermissionDenied(
  message: CommunityTelegramMessage,
  requiredRole: 'HELPER' | 'MODERATOR' | 'ADMIN' | 'BAN_AUTHORITY',
  replyChatId = String(message.chat.id),
  values?: Record<string, string>
) {
  const label =
    requiredRole === 'BAN_AUTHORITY'
      ? 'the main-group owner or the authorised Hope Hub owner account'
      : requiredRole === 'ADMIN'
        ? 'a Telegram administrator of the main group'
        : requiredRole === 'MODERATOR'
          ? 'a Hope Hub Moderator or main-group administrator'
          : 'a Hope Hub Helper, Moderator, or main-group administrator';
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    replyChatId,
    `This command was not applied. It can only be used by ${label}.`
  ).catch(() => null);
  await recordGroupHelpCommandAudit({
    message,
    targetChatId:
      values &&
      [values.telegramGroupHelpStaffGroupId, values.telegramGroupHelpLogChannelId]
        .map((value) => value?.trim())
        .includes(String(message.chat.id))
        ? values.telegramGroupHelpGroupChatId
        : String(message.chat.id),
    status: 'DENIED',
    detail: `Required role: ${requiredRole}`,
    logChatId: values?.telegramGroupHelpLogChannelId
  }).catch(() => null);
  message._groupHelpAuditRecorded = true;
}

export async function assignedCommunityRole(chatId: string, telegramUserId: string) {
  const assignments = await prisma.telegramCommunityRoleAssignment.findMany({
    where: { chatId, telegramUserId },
    select: { role: true }
  });
  return assignments.some((assignment) => assignment.role === 'MODERATOR')
    ? 'MODERATOR'
    : assignments.some((assignment) => assignment.role === 'HELPER')
      ? 'HELPER'
      : null;
}

export async function canModerate(
  message: CommunityTelegramMessage,
  whitelistValue: string,
  requiredRole: 'HELPER' | 'MODERATOR'
) {
  if (!message.from) return false;
  if (await isModerationExempt(message, whitelistValue)) return true;
  const role = await assignedCommunityRole(String(message.chat.id), String(message.from.id));
  return role === 'MODERATOR' || (requiredRole === 'HELPER' && role === 'HELPER');
}

export function configuredCommandRole(
  values: Record<string, string>,
  command: string,
  fallback: 'HELPER' | 'MODERATOR'
) {
  const target = command.toLowerCase();
  for (const line of (values.telegramGroupHelpCommandPermissions || '').split(/\r?\n/)) {
    const [configuredCommand, configuredRole] = line.split('=').map((part) => part.trim());
    if (configuredCommand?.toLowerCase() !== target) continue;
    return configuredRole?.toUpperCase() === 'HELPER'
      ? 'HELPER'
      : configuredRole?.toUpperCase() === 'MODERATOR'
        ? 'MODERATOR'
        : fallback;
  }
  return fallback;
}

export async function canUseGroupHelpCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>,
  command: string,
  fallback: 'HELPER' | 'MODERATOR'
) {
  if (!message.from) return false;
  const requiredRole = configuredCommandRole(values, command, fallback);
  if (await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || '')) return true;

  // Database roles are virtual bot powers, not Telegram administrator rights.
  // They stay valid only while the user is an active member of the configured
  // private staff group, so removing a person there immediately removes access.
  const staffGroupId = values.telegramGroupHelpStaffGroupId?.trim();
  if (
    staffGroupId &&
    !(await isActiveGroupHelpStaffMember(staffGroupId, String(message.from.id)))
  ) {
    return false;
  }

  const assignedRole = await assignedCommunityRole(
    String(message.chat.id),
    String(message.from.id)
  );
  if (assignedRole === 'MODERATOR' || (requiredRole === 'HELPER' && assignedRole === 'HELPER')) {
    return true;
  }

  const customAssignment = await prisma.telegramCommunityRoleAssignment.findFirst({
    where: {
      chatId: String(message.chat.id),
      telegramUserId: String(message.from.id),
      customRoleId: { not: null }
    },
    include: { customRole: { select: { permissions: true } } }
  });
  const permissions = customAssignment?.customRole?.permissions;
  if (!Array.isArray(permissions)) return false;
  const normalizedCommand = command.toLowerCase();
  return permissions.some(
    (permission) =>
      typeof permission === 'string' &&
      (permission === '*' || permission.toLowerCase() === normalizedCommand)
  );
}

/** Admin-only commands may be delegated explicitly without granting Telegram admin status. */
export async function canUseGroupHelpAdminCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>,
  command: string
) {
  if (!message.from) return false;
  if (await isModerationExempt(message, values.telegramGroupHelpAdminWhitelist || '')) return true;
  const staffGroupId = values.telegramGroupHelpStaffGroupId?.trim();
  if (
    staffGroupId &&
    !(await isActiveGroupHelpStaffMember(staffGroupId, String(message.from.id)))
  ) {
    return false;
  }
  const assignment = await prisma.telegramCommunityRoleAssignment.findFirst({
    where: {
      chatId: String(message.chat.id),
      telegramUserId: String(message.from.id),
      customRoleId: { not: null }
    },
    include: { customRole: { select: { permissions: true } } }
  });
  const permissions = assignment?.customRole?.permissions;
  if (!Array.isArray(permissions)) return false;
  const normalized = command.toLowerCase();
  return permissions.some(
    (permission) =>
      typeof permission === 'string' &&
      (permission === '*' || permission.toLowerCase() === normalized)
  );
}

/**
 * Ban commands are deliberately narrower than normal moderation powers.
 * A Telegram owner can always protect their own community; the two known
 * spellings preserve access for the established Hope Hub owner account.
 * Neither a Telegram administrator, a whitelist entry, nor a custom bot role
 * can grant this authority.
 */
export function isGroupHelpBanAuthority(username: string | undefined, status: string | undefined) {
  const normalizedUsername = username?.trim().replace(/^@/, '').toLowerCase() || '';
  return (
    status === 'creator' ||
    status === 'owner' ||
    GROUP_HELP_AUTOMATIC_FULL_ADMIN_USERNAMES.some((candidate) => candidate === normalizedUsername)
  );
}

export async function canUseGroupHelpBanCommand(message: CommunityTelegramMessage) {
  if (!message.from) return false;
  const membership = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    {
      chat_id: String(message.chat.id),
      user_id: message.from.id
    }
  ).catch(() => undefined);
  return isGroupHelpBanAuthority(message.from.username, membership?.status);
}
