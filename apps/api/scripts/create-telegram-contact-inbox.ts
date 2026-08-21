import 'dotenv/config';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';

const EXPECTED_OWNER_USERNAME = 'spiritualspirirt';
const SUPPORT_GROUP_CONFIG_KEY = 'telegramContactSupportGroupId';
const SESSION_PATH = '/etc/hopehub-telegram-user-session';

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();
const normalizedUsername = (value: string | undefined) =>
  value?.trim().replace(/^@/, '').toLowerCase();

function botApiChatId(channelId: string | number | bigint) {
  return `-100${String(channelId)}`;
}

async function contactBotUsername(token: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const payload = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };
  if (!response.ok || !payload.ok || !payload.result?.username) {
    throw new Error(
      `Could not identify the Contact bot: ${payload.description || response.statusText}`
    );
  }
  return payload.result.username;
}

async function sendBotConfirmation(token: string, chatId: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Contact inbox connected. New Hope Hub Contact bot requests will arrive here. Only the group owner and @spiritualspirirt can reply or take ticket actions.'
    })
  });
  const payload = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(
      `The Contact bot could not post in the new inbox: ${payload.description || response.statusText}`
    );
  }
}

async function main() {
  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const session = readFileSync(SESSION_PATH, 'utf8').trim();
  const contactBotToken = secret('hopehub-contact-bot-token');
  if (!Number.isInteger(apiId) || !apiHash || !session || !contactBotToken) {
    throw new Error('Telegram user session or Contact bot credentials are incomplete.');
  }

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5
  });
  await client.connect();
  try {
    const existingInbox = await prisma.siteConfig.findUnique({
      where: { key: SUPPORT_GROUP_CONFIG_KEY },
      select: { value: true }
    });
    if (existingInbox?.value && !process.argv.includes('--replace')) {
      throw new Error(
        `A Contact inbox is already configured (${existingInbox.value}). Use --replace only when intentionally creating a new inbox.`
      );
    }
    const owner = await client.getMe();
    if (normalizedUsername(owner.username) !== EXPECTED_OWNER_USERNAME) {
      throw new Error(
        `The configured MTProto session belongs to @${owner.username || 'unknown'}, not @${EXPECTED_OWNER_USERNAME}.`
      );
    }

    const botUsername = await contactBotUsername(contactBotToken);
    const group = await client.createChannel({
      title: 'Hope Hub Private Support Inbox',
      about:
        'Private Contact bot inbox. Access is limited to the group owner and authorised Hope Hub support staff.',
      megagroup: true
    });
    const groupPeer = await client.getInputEntity(group);
    const botPeer = await client.getInputEntity(`@${botUsername}`);
    await client.api.channels.inviteToChannel({ channel: groupPeer, users: [botPeer] });

    const chatId = botApiChatId(group.id);
    await sendBotConfirmation(contactBotToken, chatId);
    await prisma.siteConfig.upsert({
      where: { key: SUPPORT_GROUP_CONFIG_KEY },
      create: {
        key: SUPPORT_GROUP_CONFIG_KEY,
        value: chatId,
        label: 'Telegram contact support group ID'
      },
      update: { value: chatId, label: 'Telegram contact support group ID' }
    });

    // Preserve the configured inbox across a later deploy, which reads this
    // server-managed value into the API environment.
    writeFileSync('/etc/hopehub-contact-support-group-id', `${chatId}\n`, { mode: 0o600 });
    chmodSync('/etc/hopehub-contact-support-group-id', 0o600);
    console.log(`Created private Contact inbox ${chatId} and connected @${botUsername}.`);
  } finally {
    await client.disconnect();
    await prisma.$disconnect();
  }
}

await main();
