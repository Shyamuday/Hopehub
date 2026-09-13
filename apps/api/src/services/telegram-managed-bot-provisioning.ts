const BOT_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{3,30}[Bb][Oo][Tt]$/;
const SECRET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{2,79}$/;

export type ManagedBotProvisioningInput = {
  name: string;
  username: string;
  managerUsername?: string;
  secretName?: string;
  description?: string;
  shortDescription?: string;
};

export type ValidatedManagedBotProvisioningInput = {
  name: string;
  username: string;
  managerUsername?: string;
  secretName: string;
  description?: string;
  shortDescription?: string;
};

export function normalizeTelegramUsername(value: string): string {
  return value.trim().replace(/^@+/, '');
}

export function managedBotSecretName(username: string): string {
  const slug = normalizeTelegramUsername(username)
    .replace(/bot$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `hopehub-telegram-${slug || 'managed-bot'}-token`;
}

export function validateManagedBotProvisioningInput(
  input: ManagedBotProvisioningInput
): ValidatedManagedBotProvisioningInput {
  const name = input.name.trim();
  const username = normalizeTelegramUsername(input.username);
  const managerUsername = input.managerUsername
    ? normalizeTelegramUsername(input.managerUsername)
    : undefined;
  const secretName = input.secretName?.trim() || managedBotSecretName(username);
  const description = input.description?.trim() || undefined;
  const shortDescription = input.shortDescription?.trim() || undefined;

  if (!name || name.length > 64) {
    throw new Error('Bot name must contain 1 to 64 characters.');
  }
  if (!BOT_USERNAME_PATTERN.test(username)) {
    throw new Error(
      'Bot username must contain 5 to 32 Latin letters, numbers or underscores, start with a letter, and end in bot.'
    );
  }
  if (managerUsername && !/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(managerUsername)) {
    throw new Error('Manager bot username is invalid.');
  }
  if (!SECRET_NAME_PATTERN.test(secretName)) {
    throw new Error(
      'Secret name must contain 3 to 80 lowercase letters, numbers or hyphens and cannot include a path.'
    );
  }
  if (description && description.length > 512) {
    throw new Error('Bot description cannot exceed 512 characters.');
  }
  if (shortDescription && shortDescription.length > 120) {
    throw new Error('Bot short description cannot exceed 120 characters.');
  }

  return {
    name,
    username,
    managerUsername,
    secretName,
    description,
    shortDescription
  };
}

export function telegramManagedBotErrorMessage(error: unknown): string {
  const details = [
    error instanceof Error ? error.message : String(error),
    error && typeof error === 'object' && 'errorMessage' in error
      ? String((error as { errorMessage?: unknown }).errorMessage || '')
      : ''
  ].join(' ');

  if (/MANAGER_PERMISSION_MISSING/i.test(details)) {
    return 'The manager bot is not allowed to create bots. Enable Bot Management Mode for it in BotFather, then retry.';
  }
  if (/MANAGER_INVALID/i.test(details)) {
    return 'The selected manager is not a valid manager bot.';
  }
  if (/BOT_CREATE_LIMIT_EXCEEDED/i.test(details)) {
    return 'This Telegram account has reached its bot creation limit.';
  }
  if (/USERNAME_OCCUPIED/i.test(details)) {
    return 'That bot username is already in use.';
  }
  if (/USERNAME_(?:INVALID|SUFFIX_MISSING)/i.test(details)) {
    return 'Telegram rejected the bot username. It must be valid and end in bot.';
  }
  if (/FLOOD_WAIT/i.test(details)) {
    return `Telegram rate-limited bot creation. Wait for the reported interval before retrying. (${details.trim()})`;
  }
  return details.trim() || 'Telegram bot provisioning failed.';
}
