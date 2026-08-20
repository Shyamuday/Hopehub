export type PublicIdentityChangeAlert = {
  telegramUserId: string | number;
  displayName: string | null;
  changedFields: string[];
  previousDisplayName: string | null;
  previousUsername: string | null;
  username: string | null;
  previousNames: string[];
  previousUsernames: string[];
  nameChangeCount: number;
};

const MAX_PUBLIC_ALIASES = 24;
const MAX_ALIAS_LENGTH = 80;

function compactText(value: string | null | undefined, fallback: string) {
  const compact = value?.replace(/\s+/g, ' ').trim();
  if (!compact) return fallback;
  return compact.length > MAX_ALIAS_LENGTH ? `${compact.slice(0, MAX_ALIAS_LENGTH - 1)}…` : compact;
}

function aliasLines(values: string[], emptyValue: string) {
  const aliases = values
    .map((value) => compactText(value, ''))
    .filter(Boolean)
    .slice(-MAX_PUBLIC_ALIASES);
  const hiddenCount = Math.max(0, values.length - aliases.length);
  if (!aliases.length) return [`• ${emptyValue}`];
  return [
    ...aliases.map((alias) => `• ${alias}`),
    ...(hiddenCount ? [`• …and ${hiddenCount} older record${hiddenCount === 1 ? '' : 's'}`] : [])
  ];
}

/**
 * Keeps public identity-change notices readable in a busy group while still
 * showing the alias history requested for community-safety moderation.
 */
export function publicIdentityChangeAlert(input: PublicIdentityChangeAlert) {
  const changes = [
    input.changedFields.includes('name')
      ? `Name: ${compactText(input.previousDisplayName, 'No public name')} → ${compactText(input.displayName, 'No public name')}`
      : null,
    input.changedFields.includes('username')
      ? `Username: ${input.previousUsername ? `@${compactText(input.previousUsername, '')}` : 'Not set'} → ${input.username ? `@${compactText(input.username, '')}` : 'Not set'}`
      : null
  ].filter((line): line is string => Boolean(line));

  const history = [
    input.previousNames.length
      ? ['Names used before', ...aliasLines(input.previousNames, 'No earlier public name')]
      : null,
    input.previousUsernames.length
      ? ['Usernames used before', ...aliasLines(input.previousUsernames, 'No earlier username')]
      : null
  ].filter((section): section is string[] => Boolean(section));

  return [
    'Profile updated',
    '',
    `Member: ${compactText(input.displayName, 'Telegram member')}`,
    `Telegram ID: ${input.telegramUserId}`,
    '',
    'What changed',
    ...(changes.length ? changes : ['Profile details changed.']),
    ...(history.length ? ['', 'Profile history', ...history.flatMap((section) => section)] : []),
    '',
    `Observed in this group: ${input.nameChangeCount} name change${input.nameChangeCount === 1 ? '' : 's'}.`
  ].join('\n');
}
