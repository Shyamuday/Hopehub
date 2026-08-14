import { prisma } from '../db.js';
import {
  TELEGRAM_BOT_CONTROL_DEFAULTS,
  TELEGRAM_BOT_CONTROL_KEYS,
  type TelegramBotControlKey
} from '../constants/telegram-bot-controls.constants.js';

export type TelegramBotControls = Record<TelegramBotControlKey, string>;

let cached: { value: TelegramBotControls; expiresAt: number } | null = null;

export async function getTelegramBotControls(): Promise<TelegramBotControls> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: TELEGRAM_BOT_CONTROL_KEYS } },
    select: { key: true, value: true }
  });
  const value = {
    ...TELEGRAM_BOT_CONTROL_DEFAULTS,
    ...Object.fromEntries(rows.map((row) => [row.key, row.value]))
  } as TelegramBotControls;
  cached = { value, expiresAt: Date.now() + 30_000 };
  return value;
}

export function clearTelegramBotControlsCache() {
  cached = null;
}

export function controlBoolean(value: string) {
  return value === 'true';
}

export function controlNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
