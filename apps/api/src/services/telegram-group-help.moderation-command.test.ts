import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpMemberModerationNotice,
  groupHelpModerationUntilLabel,
  groupHelpModerationCommandSpec,
  groupHelpModerationUsage,
  parseGroupHelpModerationDuration
} from './telegram-group-help.moderation-command.js';

test('maps Rose-compatible moderation variants to the existing permission commands', () => {
  assert.deepEqual(groupHelpModerationCommandSpec('/tban'), {
    action: 'ban',
    permissionCommand: '/ban',
    deleteTarget: false,
    silent: false,
    timed: true
  });
  assert.deepEqual(groupHelpModerationCommandSpec('dmute'), {
    action: 'mute',
    permissionCommand: '/mute',
    deleteTarget: true,
    silent: false,
    timed: false
  });
  assert.deepEqual(groupHelpModerationCommandSpec('skick'), {
    action: 'kick',
    permissionCommand: '/kick',
    deleteTarget: true,
    silent: true,
    timed: false
  });
  assert.deepEqual(groupHelpModerationCommandSpec('swarn'), {
    action: 'warn',
    permissionCommand: '/warn',
    deleteTarget: true,
    silent: true,
    timed: false
  });
  assert.equal(groupHelpModerationCommandSpec('rmwarn')?.action, 'unwarn');
  assert.equal(groupHelpModerationCommandSpec('unknown'), undefined);
});

test('parses minute, hour, day, and week durations with a safe upper bound', () => {
  assert.equal(parseGroupHelpModerationDuration('15m')?.seconds, 900);
  assert.equal(parseGroupHelpModerationDuration('3h')?.seconds, 10_800);
  assert.equal(parseGroupHelpModerationDuration('2d')?.seconds, 172_800);
  assert.equal(parseGroupHelpModerationDuration('4W')?.seconds, 2_419_200);
  assert.equal(parseGroupHelpModerationDuration('0m'), undefined);
  assert.equal(parseGroupHelpModerationDuration('999w'), undefined);
  assert.equal(parseGroupHelpModerationDuration('60'), undefined);
});

test('formats reply and explicit-target usage in familiar Rose order', () => {
  assert.equal(
    groupHelpModerationUsage('tban', false),
    'Usage: /tban <user_id or @username> <time: Xm|Xh|Xd|Xw> [reason]'
  );
  assert.equal(
    groupHelpModerationUsage('tmute', true),
    'Usage: /tmute <time: Xm|Xh|Xd|Xw> [reason]'
  );
});

test('formats a clear member-visible moderation notice with reason and duration', () => {
  assert.equal(
    groupHelpMemberModerationNotice({
      member: 'Asha (@asha)',
      action: 'Muted',
      duration: '3h',
      until: '14 Sept 2026, 01:30 pm IST',
      reason: 'Repeated personal attacks'
    }),
    [
      '⚠️ Moderation notice',
      'Member: Asha (@asha)',
      'Action: Muted',
      'Duration: 3h',
      'Until: 14 Sept 2026, 01:30 pm IST',
      'Reason: Repeated personal attacks'
    ].join('\n')
  );
});

test('formats a moderation expiry in India time', () => {
  assert.equal(
    groupHelpModerationUntilLabel(3 * 60 * 60, new Date('2026-09-14T05:00:00.000Z')),
    '14 Sept 2026, 01:30 pm IST'
  );
});
