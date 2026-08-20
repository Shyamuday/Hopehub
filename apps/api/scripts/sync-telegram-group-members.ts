import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';
import { synchronizeConfiguredTelegramGroupMembers } from '../src/services/telegram-mtproto-member-sync.js';

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();
const apiId = Number(secret('hopehub-telegram-user-api-id'));
const apiHash = secret('hopehub-telegram-user-api-hash');
const session = readFileSync('/etc/hopehub-telegram-user-session', 'utf8').trim();

if (!Number.isInteger(apiId) || !apiHash || !session) {
  throw new Error(
    'Telegram MTProto credentials/session are incomplete. Run telegram:voice:login first.'
  );
}

const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
  connectionRetries: 5
});

await client.connect();
try {
  const results = await synchronizeConfiguredTelegramGroupMembers(client, { force: true });
  if (!results.length) {
    console.log('Telegram member synchronization is disabled or no groups are configured.');
  }
  for (const result of results) {
    console.log(
      `${result.scope}: ${result.active} active members, ${result.administrators} administrators, ${result.departed} departed (${result.chatId})`
    );
  }
} finally {
  await client.disconnect();
  await prisma.$disconnect();
}
