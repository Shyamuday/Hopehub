import 'dotenv/config';
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { validateManagedBotProvisioningInput } from '../src/services/telegram-managed-bot-provisioning.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_PATH = '/etc/hopehub-telegram-managed-bots.json';
const EXPECTED_OWNER_USERNAME = 'spiritualspirirt';
const BOT_FATHER = '@BotFather';
const BOT_TOKEN_PATTERN = /\b\d{6,14}:[A-Za-z0-9_-]{30,}\b/;

type CliOptions = {
  name?: string;
  username?: string;
  secretName?: string;
  description?: string;
  shortDescription?: string;
  help: boolean;
};

type BotState = Record<
  string,
  {
    id: string;
    name: string;
    username: string;
    managerUsername: string;
    tokenSecretPath: string;
    createdAt: string;
    updatedAt: string;
  }
>;

const HELP = `Create a conventional Telegram bot by securely driving @BotFather through the configured MTProto user session.

Usage:
  npm run telegram:botfather-bot:create -- \\
    --name "Toxic Movie Updates - Yash Unofficial" \\
    --username ToxicYashUpdatesBot \\
    --secret-name hopehub-telegram-toxic-movie-token \\
    [--description "Long bot description"] \\
    [--short-description "Short profile description"]

The BotFather token is written to /etc/<secret-name> with mode 0600 and is never printed.`;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { help: false };
  const valueOptions: Record<string, keyof Omit<CliOptions, 'help'>> = {
    '--name': 'name',
    '--username': 'username',
    '--secret-name': 'secretName',
    '--description': 'description',
    '--short-description': 'shortDescription'
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    const key = valueOptions[argument];
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function secret(name: string): string {
  return readFileSync(`/etc/${name}`, 'utf8').trim();
}

function normalizeUsername(value: string | undefined): string {
  return value?.trim().replace(/^@/, '').toLowerCase() || '';
}

function writeProtectedFile(path: string, contents: string): void {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, contents, { mode: 0o600 });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, path);
  chmodSync(path, 0o600);
}

function readState(): BotState {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as BotState;
}

async function configureProfile(token: string, description?: string, shortDescription?: string) {
  const calls: Array<{ method: string; body: Record<string, string> }> = [];
  if (description) calls.push({ method: 'setMyDescription', body: { description } });
  if (shortDescription) {
    calls.push({ method: 'setMyShortDescription', body: { short_description: shortDescription } });
  }
  for (const call of calls) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${call.method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(call.body)
    });
    const payload = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || !payload.ok) {
      throw new Error(`${call.method} failed: ${payload.description || response.statusText}`);
    }
  }
}

async function waitForIncomingReply(
  client: TelegramClient,
  afterId: number,
  description: string,
  timeoutMs = 30_000
): Promise<{ id: number; text: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await client.getMessages(BOT_FATHER, { limit: 12 });
    const reply = messages
      .filter((message) => !message.out && message.id > afterId && Boolean(message.message?.trim()))
      .sort((left, right) => left.id - right.id)[0];
    if (reply) return { id: reply.id, text: reply.message.trim() };
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`BotFather did not respond while waiting for ${description}.`);
}

async function sendAndWait(client: TelegramClient, text: string, description: string) {
  const sent = await client.sendMessage(BOT_FATHER, { message: text });
  return waitForIncomingReply(client, sent.id, description);
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(HELP);
    return;
  }
  if (!cli.name || !cli.username) {
    throw new Error('Both --name and --username are required. Run with --help for an example.');
  }
  const input = validateManagedBotProvisioningInput({
    name: cli.name,
    username: cli.username,
    secretName: cli.secretName,
    description: cli.description,
    shortDescription: cli.shortDescription
  });
  const tokenSecretPath = `/etc/${input.secretName}`;
  if (existsSync(tokenSecretPath) && secret(input.secretName)) {
    throw new Error(`A token already exists at ${tokenSecretPath}; refusing to overwrite it.`);
  }

  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const session = readFileSync(SESSION_PATH, 'utf8').trim();
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5
  });

  await client.connect();
  try {
    const owner = await client.getMe();
    if (normalizeUsername(owner.username) !== EXPECTED_OWNER_USERNAME) {
      throw new Error('The configured MTProto session is not the approved provisioning account.');
    }

    await sendAndWait(client, '/cancel', 'the previous BotFather operation to be cancelled');
    const newBotReply = await sendAndWait(client, '/newbot', 'the bot name prompt');
    if (!/name|call your bot/i.test(newBotReply.text)) {
      throw new Error(`BotFather did not enter bot creation mode: ${newBotReply.text}`);
    }
    const nameReply = await sendAndWait(client, input.name, 'the bot username prompt');
    if (!/username|must end in [`'“”]?bot/i.test(nameReply.text)) {
      throw new Error(`BotFather rejected the bot name: ${nameReply.text}`);
    }
    const creationReply = await sendAndWait(client, input.username, 'bot creation');
    const token = creationReply.text.match(BOT_TOKEN_PATTERN)?.[0];
    if (!token) {
      throw new Error(`BotFather did not create @${input.username}: ${creationReply.text}`);
    }

    writeProtectedFile(tokenSecretPath, `${token}\n`);
    await configureProfile(token, input.description, input.shortDescription);
    const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const me = (await meResponse.json()) as {
      ok?: boolean;
      result?: { id?: number; username?: string };
      description?: string;
    };
    if (
      !me.ok ||
      !me.result?.id ||
      normalizeUsername(me.result.username) !== input.username.toLowerCase()
    ) {
      throw new Error(
        `Telegram created the bot but identity verification failed: ${me.description || 'unknown error'}`
      );
    }

    const state = readState();
    const previousCreatedAt = state[input.username]?.createdAt;
    state[input.username] = {
      id: String(me.result.id),
      name: input.name,
      username: input.username,
      managerUsername: 'BotFather',
      tokenSecretPath,
      createdAt: previousCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeProtectedFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
    console.log(
      `Created @${input.username}. Token saved securely at ${tokenSecretPath}; token value was not printed.`
    );
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
