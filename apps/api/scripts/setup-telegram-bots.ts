import 'dotenv/config';
import { TelegramBotKind } from '@prisma/client';
import {
  setTelegramCommands,
  setTelegramWebhook,
  telegramBotStatus
} from '../src/services/telegram-bots.js';

const publicApiUrl = process.env.API_PUBLIC_URL || process.env.API_URL;

if (!publicApiUrl) {
  console.error('API_PUBLIC_URL or API_URL is required to set Telegram webhooks.');
  process.exit(1);
}

const dropPendingUpdates = process.argv.includes('--drop-pending');

for (const status of telegramBotStatus()) {
  if (!status.configured) {
    console.log(`[telegram] ${status.kind} skipped (${status.tokenEnv} missing)`);
    continue;
  }

  await setTelegramCommands(status.kind as TelegramBotKind);
  await setTelegramWebhook({
    kind: status.kind as TelegramBotKind,
    publicApiUrl,
    dropPendingUpdates
  });
  console.log(`[telegram] ${status.kind} webhook configured`);
}
