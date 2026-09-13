import 'dotenv/config';
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import {
  telegramManagedBotErrorMessage,
  validateManagedBotProvisioningInput
} from '../src/services/telegram-managed-bot-provisioning.js';

const SESSION_PATH = '/etc/hopehub-telegram-user-session';
const STATE_PATH = '/etc/hopehub-telegram-managed-bots.json';
const DEFAULT_MANAGER_TOKEN_SECRET = 'hopehub-telegram-hopehubbot-token';
const EXPECTED_OWNER_USERNAME = 'spiritualspirirt';

type ManagedBotState = Record<
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

type CliOptions = {
  name?: string;
  username?: string;
  manager?: string;
  secretName?: string;
  description?: string;
  shortDescription?: string;
  dryRun: boolean;
  help: boolean;
};

const HELP = `Create or recover a Telegram managed bot through the official MTProto API.

BotFather prerequisite:
  Enable Bot Management Mode for the manager bot once in BotFather.

Usage:
  npm run telegram:managed-bot:create -- \\
    --name "Hope Hub Care" \\
    --username HopeHubCareBot \\
    [--manager HopeHubAiBot] \\
    [--secret-name hopehub-telegram-care-token] \\
    [--description "Long bot description"] \\
    [--short-description "Short profile description"] \\
    [--dry-run]

The token is written to /etc/<secret-name> with mode 0600. It is never printed.
If --manager is omitted, the bot referenced by
/etc/${DEFAULT_MANAGER_TOKEN_SECRET} is used.`;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, help: false };
  const valueOptions: Record<string, keyof CliOptions> = {
    '--name': 'name',
    '--username': 'username',
    '--manager': 'manager',
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
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const key = valueOptions[argument];
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
    options[key] = value as never;
    index += 1;
  }
  return options;
}

function secret(name: string): string {
  return readFileSync(`/etc/${name}`, 'utf8').trim();
}

function normalizedUsername(value: string | undefined): string {
  return value?.trim().replace(/^@/, '').toLowerCase() || '';
}

function readState(): ManagedBotState {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as ManagedBotState;
}

function writeProtectedFile(path: string, contents: string): void {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, contents, { mode: 0o600 });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, path);
  chmodSync(path, 0o600);
}

async function managerUsernameFromConfiguredToken(): Promise<string> {
  const token = secret(DEFAULT_MANAGER_TOKEN_SECRET);
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const payload = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };
  if (!response.ok || !payload.ok || !payload.result?.username) {
    throw new Error(
      `Could not identify the configured manager bot: ${payload.description || response.statusText}`
    );
  }
  return payload.result.username;
}

async function configureBotProfile(
  token: string,
  description?: string,
  shortDescription?: string
): Promise<void> {
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
      throw new Error(
        `${call.method} failed after the bot was created: ${payload.description || response.statusText}`
      );
    }
  }
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

  const managerUsername = cli.manager || (await managerUsernameFromConfiguredToken());
  const input = validateManagedBotProvisioningInput({
    name: cli.name,
    username: cli.username,
    managerUsername,
    secretName: cli.secretName,
    description: cli.description,
    shortDescription: cli.shortDescription
  });
  const apiId = Number(secret('hopehub-telegram-user-api-id'));
  const apiHash = secret('hopehub-telegram-user-api-hash');
  const session = readFileSync(SESSION_PATH, 'utf8').trim();
  if (!Number.isInteger(apiId) || !apiHash || !session) {
    throw new Error('Telegram MTProto credentials or user session are incomplete.');
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

    const manager = await client.getEntity(`@${input.managerUsername}`);
    if (!('bot' in manager) || !manager.bot) {
      throw new Error(`@${input.managerUsername} is not a Telegram bot.`);
    }
    if (!('botCanManageBots' in manager) || !manager.botCanManageBots) {
      throw new Error(
        `@${input.managerUsername} does not have Bot Management Mode. Enable it in BotFather before creating bots through code.`
      );
    }

    const ownedBots = await client.api.bots.getAdminedBots();
    const existing = ownedBots.find(
      (bot) =>
        normalizedUsername('username' in bot ? bot.username : undefined) ===
        input.username.toLowerCase()
    );
    if (!existing) {
      const available = await client.api.bots.checkUsername({ username: input.username });
      if (!available) throw new Error(`@${input.username} is not available.`);
    }

    if (cli.dryRun) {
      console.log(
        `READY: @${input.username} can be ${existing ? 'recovered' : 'created'} under @${input.managerUsername}. No changes were made.`
      );
      return;
    }

    const bot =
      existing ||
      (await client.api.bots.createBot({
        name: input.name,
        username: input.username,
        managerId: manager
      }));
    const exported = await client.api.bots.exportBotToken({ bot, revoke: false });
    if (!exported.token?.trim()) {
      throw new Error('Telegram created the bot but did not return an authentication token.');
    }

    const tokenSecretPath = `/etc/${input.secretName}`;
    writeProtectedFile(tokenSecretPath, `${exported.token.trim()}\n`);
    const state = readState();
    const now = new Date().toISOString();
    state[input.username.toLowerCase()] = {
      id: String('id' in bot ? bot.id : ''),
      name: input.name,
      username: input.username,
      managerUsername: input.managerUsername!,
      tokenSecretPath,
      createdAt: state[input.username.toLowerCase()]?.createdAt || now,
      updatedAt: now
    };
    writeProtectedFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
    await configureBotProfile(exported.token.trim(), input.description, input.shortDescription);

    console.log(
      `${existing ? 'Recovered' : 'Created'} @${input.username}. Token saved securely at ${tokenSecretPath}; token value was not printed.`
    );
  } finally {
    await client.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(telegramManagedBotErrorMessage(error));
  process.exitCode = 1;
});
