import 'dotenv/config';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.js';

const EXPECTED_OWNER_USERNAME = 'spiritualspirirt';
const OFF_TOPIC_GROUP_CONFIG_KEY = 'telegramGroupHelpOffTopicGroupChatId';
const PRIVATE_LOG_CONFIG_KEY = 'telegramGroupHelpOffTopicLogGroupId';
const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const SERVER_STATE_PATH = '/etc/hopehub-off-topic-log-group-id';

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();
const normalizedUsername = (value: string | undefined) =>
  value?.trim().replace(/^@/, '').toLowerCase();

function botApiChatId(channelId: string | number | bigint) {
  return `-100${String(channelId)}`;
}

async function hopeHubBotUsername(token: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const payload = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };
  if (!response.ok || !payload.ok || !payload.result?.username) {
    throw new Error(`Could not identify HopeHubAI: ${payload.description || response.statusText}`);
  }
  return payload.result.username;
}

async function sendConfirmation(token: string, chatId: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: [
        'Chit-Chat moderation room connected.',
        '',
        'Warnings, mutes, bans, message deletions, reports and undo controls from HopeHub Chit-Chat will arrive only in this private group.',
        'Main support-group moderation logs will not be copied here.'
      ].join('\n')
    })
  });
  const payload = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(
      `HopeHubAI could not post in the private group: ${payload.description || response.statusText}`
    );
  }
}

async function saveRouting(offTopicChatId: string, privateGroupId: string) {
  await prisma.siteConfig.upsert({
    where: { key: PRIVATE_LOG_CONFIG_KEY },
    create: {
      key: PRIVATE_LOG_CONFIG_KEY,
      value: privateGroupId,
      label: 'Chit-Chat private moderation group ID'
    },
    update: {
      value: privateGroupId,
      label: 'Chit-Chat private moderation group ID'
    }
  });
  const existingPolicy = await prisma.telegramCommunityGroupPolicy.findUnique({
    where: { chatId: offTopicChatId },
    select: { settings: true }
  });
  const existingSettings =
    existingPolicy?.settings &&
    typeof existingPolicy.settings === 'object' &&
    !Array.isArray(existingPolicy.settings)
      ? Object.fromEntries(
          Object.entries(existingPolicy.settings).filter((entry) => typeof entry[1] === 'string')
        )
      : {};
  const settings = {
    ...existingSettings,
    telegramGroupHelpLogChannelId: privateGroupId,
    telegramGroupHelpStaffGroupId: privateGroupId,
    telegramGroupHelpReportsMode: 'staff group'
  };
  await prisma.telegramCommunityGroupPolicy.upsert({
    where: { chatId: offTopicChatId },
    create: { chatId: offTopicChatId, settings },
    update: { settings }
  });
  writeFileSync(SERVER_STATE_PATH, `${privateGroupId}\n`, { mode: 0o600 });
  chmodSync(SERVER_STATE_PATH, 0o600);
}

async function main() {
  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const session = readFileSync(SESSION_PATH, 'utf8').trim();
  const botToken = secret('hopehub-telegram-hopehubbot-token');
  if (!Number.isInteger(apiId) || !apiHash || !session || !botToken) {
    throw new Error('Telegram user session or HopeHubAI credentials are incomplete.');
  }

  const offTopicConfigs = await prisma.siteConfig.findMany({
    where: {
      key: { in: [OFF_TOPIC_GROUP_CONFIG_KEY, 'telegramGroupHelpTestGroupChatId'] }
    },
    select: { key: true, value: true }
  });
  const offTopicChatId =
    offTopicConfigs.find((entry) => entry.key === OFF_TOPIC_GROUP_CONFIG_KEY)?.value.trim() ||
    offTopicConfigs
      .find((entry) => entry.key === 'telegramGroupHelpTestGroupChatId')
      ?.value.trim() ||
    '';
  if (!offTopicChatId) {
    throw new Error('Configure the HopeHub Chit-Chat group before creating its moderation room.');
  }

  const existing = await prisma.siteConfig.findUnique({
    where: { key: PRIVATE_LOG_CONFIG_KEY },
    select: { value: true }
  });
  if (existing?.value.trim() && !process.argv.includes('--replace')) {
    await saveRouting(offTopicChatId, existing.value.trim());
    console.log(`Chit-Chat moderation routing already uses ${existing.value.trim()}.`);
    return;
  }

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5
  });
  await client.connect();
  try {
    const owner = await client.getMe();
    if (normalizedUsername(owner.username) !== EXPECTED_OWNER_USERNAME) {
      throw new Error(
        `The configured MTProto session belongs to @${owner.username || 'unknown'}, not @${EXPECTED_OWNER_USERNAME}.`
      );
    }

    const botUsername = await hopeHubBotUsername(botToken);
    const group = await client.createChannel({
      title: 'HopeHub Chit-Chat Moderation',
      about:
        'Private HopeHubAI moderation room for HopeHub Chit-Chat. Contains safety logs and reversible moderation controls.',
      megagroup: true
    });
    const groupPeer = await client.getInputEntity(group);
    const botPeer = await client.getInputEntity(`@${botUsername}`);
    await client.api.channels.inviteToChannel({ channel: groupPeer, users: [botPeer] });

    const privateGroupId = botApiChatId(group.id);
    await sendConfirmation(botToken, privateGroupId);
    await saveRouting(offTopicChatId, privateGroupId);
    console.log(
      `Created private Chit-Chat moderation group ${privateGroupId} and connected @${botUsername}.`
    );
  } finally {
    await client.disconnect();
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
