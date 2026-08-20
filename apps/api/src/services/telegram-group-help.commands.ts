import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { handleGroupHelpAdminCommand } from './telegram-group-help.admin-commands.js';
import { handleGroupHelpMemberCommand } from './telegram-group-help.member-commands.js';
import { handleGroupHelpReportCommand } from './telegram-group-help.reports.js';
import { handleGroupHelpStaffCommand } from './telegram-group-help.staff-commands.js';
import { resolveGroupHelpCommandContext } from './telegram-group-help.command-context.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import { recordGroupHelpCommandAudit } from './telegram-group-help.command-audit.js';

/**
 * The single source of truth for commands supported by the Hope Hub group bot.
 * Command implementations remain in focused files so that moderation, privacy,
 * and administrator changes do not become one unsafe file again.
 */
export const GROUP_HELP_COMMAND_CATALOG = {
  member: [
    '/start',
    '/help',
    '/rules',
    '/support',
    '/warnings',
    '/me',
    '/id',
    '/staffid',
    '/admin',
    '/alertadmin',
    '/forget',
    '/forgot'
  ],
  staff: [
    '/info',
    '/member',
    '/perms',
    '/geturl',
    '/staff',
    '/stats',
    '/clearwarnings',
    '/adminlist'
  ],
  moderation: [
    '/warn',
    '/unwarn',
    '/delete',
    '/del',
    '/delwarn',
    '/delmute',
    '/delban',
    '/delkick',
    '/mute',
    '/unmute',
    '/ro',
    '/unro',
    '/ban',
    '/unban',
    '/kick'
  ],
  roles: [
    '/helper',
    '/unhelper',
    '/mod',
    '/unmod',
    '/moderator',
    '/unmoderator',
    '/free',
    '/unfree'
  ],
  administration: [
    '/settings',
    '/pin',
    '/unpin',
    '/unpinall',
    '/pinned',
    '/promote',
    '/demote',
    '/unadmin',
    '/title',
    '/untitle',
    '/welcome',
    '/filter',
    '/unfilter',
    '/filters',
    '/lockdown',
    '/unlock',
    '/settestgroup',
    '/setlog'
  ],
  safety: ['/report']
} as const;

export type GroupHelpCommandDefinition = {
  command: string;
  area: keyof typeof GROUP_HELP_COMMAND_CATALOG;
  minimumRole: 'MEMBER' | 'HELPER' | 'MODERATOR' | 'ADMIN';
  destructive: boolean;
};

const moderatorCommands = new Set([
  '/stats',
  '/clearwarnings',
  '/mute',
  '/unmute',
  '/ro',
  '/unro',
  '/ban',
  '/unban',
  '/kick',
  '/delmute',
  '/delban',
  '/delkick'
]);
const destructiveCommands = new Set([
  '/ban',
  '/kick',
  '/delban',
  '/delkick',
  '/promote',
  '/demote',
  '/unadmin',
  '/unpinall',
  '/lockdown'
]);

/** Machine-readable command registry used to prevent help/dispatch drift. */
export const GROUP_HELP_COMMAND_DEFINITIONS: readonly GroupHelpCommandDefinition[] = Object.entries(
  GROUP_HELP_COMMAND_CATALOG
).flatMap(([area, commands]) =>
  commands.map((command) => ({
    command,
    area: area as keyof typeof GROUP_HELP_COMMAND_CATALOG,
    minimumRole:
      area === 'administration' || area === 'roles'
        ? 'ADMIN'
        : moderatorCommands.has(command)
          ? 'MODERATOR'
          : area === 'staff' || area === 'moderation'
            ? 'HELPER'
            : 'MEMBER',
    destructive: destructiveCommands.has(command)
  }))
);

const commandDefinitions = new Map(
  GROUP_HELP_COMMAND_DEFINITIONS.map((definition) => [definition.command, definition])
);

export function groupHelpCommandDefinition(command: string) {
  return commandDefinitions.get(command.toLowerCase());
}

export async function handleGroupHelpCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (!groupHelpCommandDefinition(command)) return false;
  const context = await resolveGroupHelpCommandContext(message);
  const effectiveValues = context.isControlGroup
    ? await groupHelpConfig(context.targetChatId)
    : values;
  const handled =
    (await handleGroupHelpStaffCommand(message, effectiveValues)) ||
    (await handleGroupHelpMemberCommand(message, effectiveValues)) ||
    (await handleGroupHelpReportCommand(message, effectiveValues)) ||
    (await handleGroupHelpAdminCommand(message, effectiveValues));
  if (handled) {
    await recordGroupHelpCommandAudit({
      message,
      targetChatId: context.targetChatId,
      status: 'HANDLED'
    });
  }
  return handled;
}
