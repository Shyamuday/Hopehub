import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { recordGroupHelpCommandAudit } from './telegram-group-help.command-audit.js';

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
  requiredRole: 'HELPER' | 'MODERATOR' | 'ADMIN',
  replyChatId = String(message.chat.id)
) {
  const label =
    requiredRole === 'ADMIN'
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
    targetChatId: String(message.chat.id),
    status: 'DENIED',
    detail: `Required role: ${requiredRole}`
  }).catch(() => null);
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
  if (await canModerate(message, values.telegramGroupHelpAdminWhitelist || '', requiredRole))
    return true;

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
