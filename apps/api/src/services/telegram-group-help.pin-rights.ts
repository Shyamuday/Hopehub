const EXCLUSIVE_PIN_ADMIN_USERNAME = 'spiritualspirit';

export function canManageGroupHelpPins(input: {
  username?: string | null;
  status?: string | null;
}) {
  const status = input.status?.trim().toLowerCase() || '';
  if (['creator', 'owner'].includes(status)) return true;
  return input.username?.trim().replace(/^@/, '').toLowerCase() === EXCLUSIVE_PIN_ADMIN_USERNAME;
}

export const GROUP_HELP_EXCLUSIVE_PIN_ADMIN_USERNAME = EXCLUSIVE_PIN_ADMIN_USERNAME;
