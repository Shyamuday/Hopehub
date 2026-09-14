export type GroupHelpModerationAction =
  'warn' | 'unwarn' | 'delete' | 'mute' | 'unmute' | 'ban' | 'unban' | 'kick' | 'ro' | 'unro';

export type GroupHelpModerationCommandSpec = {
  action: GroupHelpModerationAction;
  permissionCommand: string;
  deleteTarget: boolean;
  silent: boolean;
  timed: boolean;
};

const roseCommands: Record<string, GroupHelpModerationCommandSpec> = {
  ban: {
    action: 'ban',
    permissionCommand: '/ban',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  tban: {
    action: 'ban',
    permissionCommand: '/ban',
    deleteTarget: false,
    silent: false,
    timed: true
  },
  dban: {
    action: 'ban',
    permissionCommand: '/ban',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  sban: {
    action: 'ban',
    permissionCommand: '/ban',
    deleteTarget: true,
    silent: true,
    timed: false
  },
  unban: {
    action: 'unban',
    permissionCommand: '/unban',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  mute: {
    action: 'mute',
    permissionCommand: '/mute',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  tmute: {
    action: 'mute',
    permissionCommand: '/mute',
    deleteTarget: false,
    silent: false,
    timed: true
  },
  dmute: {
    action: 'mute',
    permissionCommand: '/mute',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  smute: {
    action: 'mute',
    permissionCommand: '/mute',
    deleteTarget: true,
    silent: true,
    timed: false
  },
  unmute: {
    action: 'unmute',
    permissionCommand: '/unmute',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  kick: {
    action: 'kick',
    permissionCommand: '/kick',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  dkick: {
    action: 'kick',
    permissionCommand: '/kick',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  skick: {
    action: 'kick',
    permissionCommand: '/kick',
    deleteTarget: true,
    silent: true,
    timed: false
  },
  // Existing Hope Hub aliases remain supported.
  delban: {
    action: 'ban',
    permissionCommand: '/ban',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  delmute: {
    action: 'mute',
    permissionCommand: '/mute',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  delkick: {
    action: 'kick',
    permissionCommand: '/kick',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  warn: {
    action: 'warn',
    permissionCommand: '/warn',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  delwarn: {
    action: 'warn',
    permissionCommand: '/warn',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  dwarn: {
    action: 'warn',
    permissionCommand: '/warn',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  swarn: {
    action: 'warn',
    permissionCommand: '/warn',
    deleteTarget: true,
    silent: true,
    timed: false
  },
  unwarn: {
    action: 'unwarn',
    permissionCommand: '/unwarn',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  rmwarn: {
    action: 'unwarn',
    permissionCommand: '/unwarn',
    deleteTarget: false,
    silent: false,
    timed: false
  },
  delete: {
    action: 'delete',
    permissionCommand: '/delete',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  del: {
    action: 'delete',
    permissionCommand: '/delete',
    deleteTarget: true,
    silent: false,
    timed: false
  },
  ro: { action: 'ro', permissionCommand: '/ro', deleteTarget: false, silent: false, timed: false },
  unro: {
    action: 'unro',
    permissionCommand: '/unro',
    deleteTarget: false,
    silent: false,
    timed: false
  }
};

export function groupHelpModerationCommandSpec(commandName: string) {
  return roseCommands[commandName.trim().replace(/^\//, '').toLowerCase()];
}

const durationUnits = { m: 60, h: 60 * 60, d: 24 * 60 * 60, w: 7 * 24 * 60 * 60 };
export const MAX_GROUP_HELP_TIMED_ACTION_SECONDS = 366 * 24 * 60 * 60;

export function parseGroupHelpModerationDuration(value: string | undefined) {
  const match = /^(\d{1,4})([mhdw])$/i.exec(value?.trim() || '');
  if (!match) return undefined;
  const amount = Number(match[1]);
  const seconds = amount * durationUnits[match[2].toLowerCase() as keyof typeof durationUnits];
  if (amount < 1 || seconds > MAX_GROUP_HELP_TIMED_ACTION_SECONDS) return undefined;
  return { seconds, input: `${amount}${match[2].toLowerCase()}` };
}

export function groupHelpModerationUsage(commandName: string, replied: boolean) {
  const spec = groupHelpModerationCommandSpec(commandName);
  const command = `/${commandName.replace(/^\//, '').toLowerCase()}`;
  if (!spec) return `Usage: ${command}`;
  if (spec.action === 'delete') return `Usage: reply to a message with ${command} [reason]`;
  const target = replied ? '' : ' <user_id or @username>';
  const duration = spec.timed ? ' <time: Xm|Xh|Xd|Xw>' : '';
  return `Usage: ${command}${target}${duration} [reason]`;
}

export function groupHelpMemberModerationNotice(input: {
  member: string;
  action: string;
  reason: string;
  duration: string;
  warningStatus?: string;
}) {
  return [
    '⚠️ Moderation notice',
    `Member: ${input.member}`,
    `Action: ${input.action}`,
    `Duration: ${input.duration}`,
    `Reason: ${input.reason}`,
    input.warningStatus ? `Warning status: ${input.warningStatus}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}
