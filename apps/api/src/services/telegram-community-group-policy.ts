import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export type TelegramCommunityGroupPolicyInput = Record<string, string>;

function stringSettings(value: Prisma.JsonValue): TelegramCommunityGroupPolicyInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

export async function getTelegramCommunityGroupPolicy(chatId: string) {
  const policy = await prisma.telegramCommunityGroupPolicy.findUnique({ where: { chatId } });
  return policy ? stringSettings(policy.settings) : {};
}

export async function saveTelegramCommunityGroupPolicy(
  chatId: string,
  settings: TelegramCommunityGroupPolicyInput
) {
  return prisma.telegramCommunityGroupPolicy.upsert({
    where: { chatId },
    create: { chatId, settings: settings as Prisma.InputJsonValue },
    update: { settings: settings as Prisma.InputJsonValue }
  });
}

export async function startTelegramCommunityLockdown(input: {
  chatId: string;
  minutes: number;
  originalPermissions: Record<string, boolean>;
}) {
  const existing = await getTelegramCommunityGroupPolicy(input.chatId);
  return prisma.telegramCommunityGroupPolicy.upsert({
    where: { chatId: input.chatId },
    create: {
      chatId: input.chatId,
      settings: { ...existing, __lockdownPermissions: JSON.stringify(input.originalPermissions) },
      lockdownUntil: new Date(Date.now() + input.minutes * 60_000),
      lockdownReason: 'Admin command'
    },
    update: {
      settings: { ...existing, __lockdownPermissions: JSON.stringify(input.originalPermissions) },
      lockdownUntil: new Date(Date.now() + input.minutes * 60_000),
      lockdownReason: 'Admin command'
    }
  });
}

export async function endTelegramCommunityLockdown(chatId: string) {
  return prisma.telegramCommunityGroupPolicy.update({
    where: { chatId },
    data: { lockdownUntil: null, lockdownReason: null }
  });
}

export async function expiredTelegramCommunityLockdowns(now = new Date()) {
  return prisma.telegramCommunityGroupPolicy.findMany({
    where: { lockdownUntil: { lte: now } },
    select: { chatId: true, settings: true }
  });
}

export function savedLockdownPermissions(settings: Prisma.JsonValue) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const raw = (settings as Record<string, unknown>).__lockdownPermissions;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, boolean>)
      : null;
  } catch {
    return null;
  }
}
