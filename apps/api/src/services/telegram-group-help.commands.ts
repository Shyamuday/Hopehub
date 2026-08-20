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

export const GROUP_HELP_STAFF_PERMISSION_GROUPS = [
  {
    key: 'member_info',
    label: 'View member information',
    commands: ['/info', '/member', '/perms', '/geturl', '/staff', '/adminlist'],
    defaultEnabled: true
  },
  { key: 'statistics', label: 'View statistics', commands: ['/stats'], defaultEnabled: true },
  {
    key: 'warnings',
    label: 'Manage warnings',
    commands: ['/warn', '/unwarn', '/clearwarnings'],
    defaultEnabled: true
  },
  {
    key: 'delete',
    label: 'Delete messages',
    commands: ['/delete', '/del', '/delwarn'],
    defaultEnabled: true
  },
  {
    key: 'mute',
    label: 'Mute and unmute',
    commands: ['/mute', '/unmute', '/ro', '/unro', '/delmute'],
    defaultEnabled: true
  },
  {
    key: 'ban',
    label: 'Ban and unban',
    commands: ['/ban', '/unban', '/delban'],
    defaultEnabled: false
  },
  {
    key: 'kick',
    label: 'Remove members',
    commands: ['/kick', '/delkick'],
    defaultEnabled: false
  },
  {
    key: 'pin',
    label: 'Manage pinned messages',
    commands: ['/pin', '/unpin', '/pinned', '/unpinall'],
    defaultEnabled: false
  },
  {
    key: 'filters',
    label: 'Manage blocked phrases',
    commands: ['/filter', '/unfilter', '/filters'],
    defaultEnabled: false
  },
  {
    key: 'welcome',
    label: 'Manage welcome messages',
    commands: ['/welcome'],
    defaultEnabled: false
  },
  {
    key: 'lockdown',
    label: 'Lock and unlock group',
    commands: ['/lockdown', '/unlock'],
    defaultEnabled: false
  },
  {
    key: 'staff_roles',
    label: 'Manage Hope Hub staff roles',
    commands: [
      '/helper',
      '/unhelper',
      '/mod',
      '/unmod',
      '/moderator',
      '/unmoderator',
      '/free',
      '/unfree'
    ],
    defaultEnabled: false
  },
  {
    key: 'telegram_admins',
    label: 'Manage Telegram administrators',
    commands: ['/promote', '/demote', '/unadmin', '/title', '/untitle'],
    defaultEnabled: false
  },
  {
    key: 'settings',
    label: 'Open and update settings',
    commands: ['/settings'],
    defaultEnabled: false
  }
] as const;

/** Routine powers automatically granted when a person joins the private staff group. */
export const GROUP_HELP_DEFAULT_STAFF_COMMANDS = GROUP_HELP_STAFF_PERMISSION_GROUPS.filter(
  (group) => group.defaultEnabled
).flatMap((group) => [...group.commands]);

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
    if (!message._groupHelpAuditRecorded) {
      await recordGroupHelpCommandAudit({
        message,
        targetChatId: context.targetChatId,
        status: 'HANDLED',
        logChatId: effectiveValues.telegramGroupHelpLogChannelId
      });
      message._groupHelpAuditRecorded = true;
    }
  }
  return handled;
}
