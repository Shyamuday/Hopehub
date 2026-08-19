import { createHash, randomBytes } from 'node:crypto';
import { Role, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { getSiteConfigMap } from './site-config.service.js';
import { roleByKind } from './telegram-bots.config.js';

const LINK_TTL_MS = 15 * 60 * 1000;

type PublicConnection = {
  connected: boolean;
  telegramUsername: string | null;
  displayName: string | null;
  connectedAt: Date | null;
  botUsername: string;
  communityUrl: string | null;
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function botKindForRole(role: Role): TelegramBotKind | null {
  if (role === Role.PATIENT) return TelegramBotKind.USER;
  if (role === Role.DOCTOR) return TelegramBotKind.DOCTOR;
  return null;
}

async function publicBotConfig(kind: TelegramBotKind) {
  const config = await getSiteConfigMap([
    'telegramUsername',
    kind === TelegramBotKind.DOCTOR ? 'telegramDoctorBotUsername' : 'telegramUserBotUsername'
  ]);
  const botUsername = config[
    kind === TelegramBotKind.DOCTOR ? 'telegramDoctorBotUsername' : 'telegramUserBotUsername'
  ]
    .trim()
    .replace(/^@/, '');
  const communityUsername = config.telegramUsername.trim().replace(/^@/, '');
  return {
    botUsername,
    communityUrl: communityUsername ? `https://t.me/${communityUsername}` : null
  };
}

export async function telegramConnectionForUser(
  userId: string,
  role: Role
): Promise<PublicConnection> {
  const kind = botKindForRole(role);
  if (!kind) throw new Error('Telegram account linking is unavailable for this account.');
  const [session, config] = await Promise.all([
    prisma.telegramBotSession.findFirst({
      where: { linkedUserId: userId, botKind: kind },
      orderBy: { updatedAt: 'desc' },
      select: { username: true, firstName: true, lastName: true, updatedAt: true }
    }),
    publicBotConfig(kind)
  ]);
  return {
    connected: Boolean(session),
    telegramUsername: session?.username ?? null,
    displayName: [session?.firstName, session?.lastName].filter(Boolean).join(' ') || null,
    connectedAt: session?.updatedAt ?? null,
    botUsername: config.botUsername,
    communityUrl: config.communityUrl
  };
}

export async function createTelegramAccountLink(userId: string, role: Role) {
  const kind = botKindForRole(role);
  if (!kind) throw new Error('Telegram account linking is unavailable for this account.');
  const config = await publicBotConfig(kind);
  if (!config.botUsername)
    throw new Error('The Telegram bot username has not been configured yet.');

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  await prisma.$transaction([
    prisma.telegramAccountLink.deleteMany({
      where: { userId, botKind: kind, usedAt: null }
    }),
    prisma.telegramAccountLink.create({
      data: { userId, botKind: kind, tokenHash: hashToken(token), expiresAt }
    })
  ]);
  return {
    url: `https://t.me/${config.botUsername}?start=connect_${token}`,
    expiresAt,
    botUsername: config.botUsername,
    communityUrl: config.communityUrl
  };
}

export async function claimTelegramAccountLink(
  kind: TelegramBotKind,
  token: string,
  telegramUserId: string | null | undefined
) {
  if (!telegramUserId || !/^[A-Za-z0-9_-]{30,}$/.test(token)) return null;
  const now = new Date();
  const pending = await prisma.telegramAccountLink.findFirst({
    where: { botKind: kind, tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: now } },
    include: { user: { select: { id: true, name: true, role: true, isActive: true } } }
  });
  if (!pending || !pending.user.isActive || pending.user.role !== roleByKind[kind]) return null;

  const claimed = await prisma.telegramAccountLink.updateMany({
    where: { id: pending.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now, telegramUserId }
  });
  if (!claimed.count) return null;
  return { userId: pending.user.id, name: pending.user.name };
}

export async function unlinkTelegramAccount(userId: string, role: Role) {
  const kind = botKindForRole(role);
  if (!kind) throw new Error('Telegram account linking is unavailable for this account.');
  await prisma.telegramBotSession.updateMany({
    where: { linkedUserId: userId, botKind: kind },
    data: { linkedUserId: null, state: 'ACTIVE', lastCommand: '/unlink' }
  });
  await prisma.telegramAccountLink.deleteMany({ where: { userId, botKind: kind, usedAt: null } });
}
