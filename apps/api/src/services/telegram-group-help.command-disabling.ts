export const GROUP_HELP_DISABLEABLE_COMMANDS = [
  '/adminlist',
  '/filters',
  '/id',
  '/info',
  '/rules',
  '/warnings',
  '/warns'
] as const;

const disableableCommands = new Set<string>(GROUP_HELP_DISABLEABLE_COMMANDS);

export function normalizeGroupHelpCommandName(value: string | undefined) {
  const first = (value || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (!first) return '';
  return first.startsWith('/') ? first : `/${first}`;
}

export function isGroupHelpCommandDisableable(value: string | undefined) {
  return disableableCommands.has(normalizeGroupHelpCommandName(value));
}

export function disabledGroupHelpCommands(value: string | undefined) {
  return [
    ...new Set(
      (value || '')
        .split(/[\s,]+/)
        .map(normalizeGroupHelpCommandName)
        .filter((command) => disableableCommands.has(command))
    )
  ].sort();
}

export function shouldSuppressGroupHelpCommand(input: {
  command: string;
  disabledCommands: string | undefined;
  actorIsAdmin: boolean;
  disableForAdmins: boolean;
}) {
  if (!disabledGroupHelpCommands(input.disabledCommands).includes(input.command)) return false;
  return !input.actorIsAdmin || input.disableForAdmins;
}
