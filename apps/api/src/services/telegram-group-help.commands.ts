import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import { handleGroupHelpAdminCommand } from './telegram-group-help.admin-commands.js';
import { handleGroupHelpMemberCommand } from './telegram-group-help.member-commands.js';
import { handleGroupHelpReportCommand } from './telegram-group-help.reports.js';
import { handleGroupHelpStaffCommand } from './telegram-group-help.staff-commands.js';

/**
 * The single source of truth for commands supported by the Hope Hub group bot.
 * Command implementations remain in focused files so that moderation, privacy,
 * and administrator changes do not become one unsafe file again.
 */
export const GROUP_HELP_COMMAND_CATALOG = {
  member: ['/start', '/help', '/rules', '/support', '/warnings', '/me', '/admin', '/forget'],
  staff: ['/info', '/member', '/perms', '/geturl', '/staff', '/stats', '/clearwarnings'],
  moderation: [
    '/warn',
    '/unwarn',
    '/delete',
    '/delwarn',
    '/delmute',
    '/delban',
    '/mute',
    '/unmute',
    '/ban',
    '/unban',
    '/kick'
  ],
  roles: ['/helper', '/unhelper', '/moderator', '/unmoderator', '/mod', '/unmod'],
  administration: [
    '/settings',
    '/pin',
    '/unpin',
    '/pinned',
    '/lockdown',
    '/unlock',
    '/settestgroup',
    '/setlog'
  ],
  safety: ['/report']
} as const;

export async function handleGroupHelpCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  if (await handleGroupHelpStaffCommand(message, values)) return true;
  if (await handleGroupHelpMemberCommand(message, values)) return true;
  if (await handleGroupHelpReportCommand(message, values)) return true;
  return handleGroupHelpAdminCommand(message, values);
}
