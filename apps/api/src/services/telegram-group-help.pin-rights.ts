const EXCLUSIVE_PIN_ADMIN_USERNAMES = ['spiritualspirit', 'spiritualspirirt'] as const;

export function isExclusiveGroupHelpPinAdminUsername(username?: string | null) {
  const normalized = username?.trim().replace(/^@/, '').toLowerCase() || '';
  return EXCLUSIVE_PIN_ADMIN_USERNAMES.some((candidate) => candidate === normalized);
}

export function canManageGroupHelpPins(input: {
  username?: string | null;
  status?: string | null;
}) {
  const status = input.status?.trim().toLowerCase() || '';
  if (['creator', 'owner'].includes(status)) return true;
  return isExclusiveGroupHelpPinAdminUsername(input.username);
}

export const GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME = EXCLUSIVE_PIN_ADMIN_USERNAMES[0];
