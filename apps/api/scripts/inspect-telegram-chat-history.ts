import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const EXPECTED_OWNER_USERNAME = 'spiritualspirirt';

function argument(name: string, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function secret(name: string) {
  return readFileSync(`/etc/${name}`, 'utf8').trim();
}

function mediaExtension(message: any) {
  const mime = String(message.media?.document?.mimeType || '').toLowerCase();
  const fileName = message.file?.name || '';
  const suffix = path.extname(fileName);
  if (suffix) return suffix.toLowerCase();
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime.startsWith('image/')) return '.jpg';
  if (message.photo || message.media?.photo) return '.jpg';
  return '.bin';
}

async function main() {
  const chatId = argument('--chat-id');
  const limit = Math.max(1, Math.min(100, Number(argument('--limit', '10')) || 10));
  const outputDirectory = path.resolve(argument('--output', '/tmp/hopehub-telegram-history'));
  if (!/^-?\d+$/.test(chatId)) throw new Error('--chat-id must be a Telegram numeric chat ID.');

  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const session = readFileSync(SESSION_PATH, 'utf8').trim();
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5
  });

  mkdirSync(outputDirectory, { recursive: true });
  await client.connect();
  try {
    const owner = await client.getMe();
    if (owner.username?.toLowerCase() !== EXPECTED_OWNER_USERNAME) {
      throw new Error('The configured MTProto session is not the approved Hope Hub owner account.');
    }
    const messages = await client.getMessages(Number(chatId), { limit });
    const records = [];
    for (const message of [...messages].reverse()) {
      const sender = await message.getSender().catch(() => null);
      let mediaFile: string | null = null;
      if (message.media) {
        const downloaded = await message.downloadMedia();
        if (Buffer.isBuffer(downloaded)) {
          mediaFile = `message-${message.id}${mediaExtension(message)}`;
          writeFileSync(path.join(outputDirectory, mediaFile), downloaded);
        }
      }
      records.push({
        id: message.id,
        date: message.date ? new Date(message.date * 1000).toISOString() : null,
        sender: sender
          ? {
              id: String((sender as any).id || ''),
              username: (sender as any).username || null,
              name:
                [(sender as any).firstName, (sender as any).lastName].filter(Boolean).join(' ') ||
                null
            }
          : null,
        text: message.message || '',
        mediaType: message.media?.className || null,
        mediaFile
      });
    }
    writeFileSync(
      path.join(outputDirectory, 'messages.json'),
      `${JSON.stringify(records, null, 2)}\n`,
      'utf8'
    );
    console.log(JSON.stringify({ chatId, outputDirectory, messages: records }, null, 2));
  } finally {
    await client.disconnect();
  }
}

await main();
