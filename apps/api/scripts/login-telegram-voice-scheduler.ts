import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';

const secret = (name: string) => readFileSync(`/etc/${name}`, 'utf8').trim();
const apiId = Number(secret('hopehub-telegram-user-api-id'));
const apiHash = secret('hopehub-telegram-user-api-hash');
const phoneNumber = secret('hopehub-telegram-user-phone');

if (!Number.isInteger(apiId) || !apiHash || !phoneNumber) {
  throw new Error('Telegram user-account credentials are incomplete.');
}

const sessionPath = '/etc/hopehub-telegram-user-session';
let savedSession = '';
try {
  savedSession = readFileSync(sessionPath, 'utf8').trim();
} catch {
  // A first login intentionally starts with an empty session.
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const client = new TelegramClient(new StringSession(savedSession), apiId, apiHash, {
  connectionRetries: 5
});

await client.start({
  phoneNumber: async () => phoneNumber,
  phoneCode: async () => prompt.question('Telegram OTP: '),
  password: async () => prompt.question('Telegram 2-step password (if enabled): '),
  onError: async (error) => {
    console.error(error instanceof Error ? error.message : error);
    // Authentication errors such as PHONE_NUMBER_INVALID are permanent until
    // configuration changes. Stop instead of repeatedly requesting codes.
    return true;
  }
});

const account = await client.getMe();
writeFileSync(sessionPath, client.session.save(), { mode: 0o600 });
chmodSync(sessionPath, 0o600);
console.log(
  `Authenticated Telegram account: ${account.username || account.firstName || account.id}`
);
await client.disconnect();
prompt.close();

if (existsSync('/etc/systemd/system/hopehub-telegram-voice-scheduler.timer')) {
  execFileSync('systemctl', ['enable', '--now', 'hopehub-telegram-voice-scheduler.timer'], {
    stdio: 'inherit'
  });
  console.log('Native voice scheduler enabled.');
}
