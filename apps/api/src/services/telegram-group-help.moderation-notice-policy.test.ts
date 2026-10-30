import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpModerationNoticePolicy,
  groupHelpModerationNoticeText,
  shouldShowGroupHelpModerationNotice,
  validateGroupHelpModerationNoticeSetting,
  GROUP_HELP_MODERATION_FEEDBACK_NOTICE
} from './telegram-group-help.moderation-notice-policy.js';
import { GROUP_HELP_MOD_NOTICE_FIELDS } from '../constants/group-help-moderation-notice.constants.js';
import { GROUP_HELP_CONFIG_FIELDS } from '../constants/group-help-config.constants.js';
import { groupCommandDeleteDelaySeconds } from './telegram-group-help.command-cleanup.js';
import { saveGroupHelpBotSetting } from './telegram-group-help.bot-settings.js';
import { prisma } from '../db.js';

test('notice controls default to the requested message and 24-hour retention', () => {
  const policy = groupHelpModerationNoticePolicy();
  assert.equal(policy.enabled, true);
  assert.equal(policy.seconds, 86400);
  assert.equal(policy.commandSeconds, 3);
  assert.equal(policy.footer, GROUP_HELP_MODERATION_FEEDBACK_NOTICE);
  assert.deepEqual([...policy.actions], ['ban', 'mute', 'warn']);
  assert.equal(policy.silent && policy.rules && policy.staffCopy, true);
  for (const field of GROUP_HELP_MOD_NOTICE_FIELDS) {
    assert.ok(GROUP_HELP_CONFIG_FIELDS.includes(field));
    assert.ok(Buffer.byteLength(`hh_cfg_field:${field.key}`) <= 64);
    assert.ok(Buffer.byteLength(`hh_cfg_set:${field.key}:0`) <= 64);
  }
});

test('admins can select actions, disable notices or footer, and edit contact wording', () => {
  const settings = {
    telegramGroupHelpModNoticeActions: 'ban mute',
    telegramGroupHelpModFooter: 'Contact @OtherBot'
  };
  assert.equal(shouldShowGroupHelpModerationNotice('warn', settings), false);
  assert.equal(shouldShowGroupHelpModerationNotice('mute', settings), true);
  assert.equal(
    shouldShowGroupHelpModerationNotice('ban', {
      ...settings,
      telegramGroupHelpModNoticeEnabled: 'Disabled'
    }),
    false
  );
  assert.equal(
    groupHelpModerationNoticeText('Muted', 'mute', settings),
    'Muted\n\nContact @OtherBot'
  );
  assert.equal(
    groupHelpModerationNoticeText('Muted', 'mute', {
      ...settings,
      telegramGroupHelpModFooterEnabled: 'Disabled'
    }),
    'Muted'
  );
  const off = groupHelpModerationNoticePolicy({
    telegramGroupHelpModNoticeSilent: 'Disabled',
    telegramGroupHelpModNoticeRules: 'Disabled',
    telegramGroupHelpModNoticeStaffCopy: 'Disabled'
  });
  assert.equal(off.silent || off.rules || off.staffCopy, false);
});

test('saved moderation footers correct the old contact handle without changing custom contacts', () => {
  assert.equal(
    groupHelpModerationNoticeText('Banned', 'ban', {
      telegramGroupHelpModFooter: 'Please contact @Contacthopehubb for help.'
    }),
    'Banned\n\nPlease contact @Contacthopehubbot for help.'
  );
  assert.match(GROUP_HELP_MODERATION_FEEDBACK_NOTICE, /CONTACT ADMIN: @Contacthopehubbot$/);
  assert.equal(
    groupHelpModerationNoticePolicy({ telegramGroupHelpModFooter: 'Contact @OtherBot' }).footer,
    'Contact @OtherBot'
  );
});

test('only bot notices support long retention or keep; public command cleanup stays short', () => {
  const settings = {
    telegramGroupHelpModNoticeSeconds: '0',
    telegramGroupHelpModCommandSeconds: '3600'
  };
  assert.equal(groupHelpModerationNoticePolicy(settings).seconds, 0);
  for (const value of ['0', '61', '86400', '-1']) {
    assert.throws(() =>
      validateGroupHelpModerationNoticeSetting('telegramGroupHelpModCommandSeconds', value)
    );
  }
  validateGroupHelpModerationNoticeSetting('telegramGroupHelpModCommandSeconds', '3');
  assert.equal(groupCommandDeleteDelaySeconds('3', '/tban', settings), 3);
  assert.equal(groupCommandDeleteDelaySeconds('3', '/help', settings), 3);
  assert.equal(
    groupCommandDeleteDelaySeconds('3', '/swarn', { telegramGroupHelpModCommandSeconds: '0' }),
    3
  );
  for (const value of ['-1', '86401', '1.5', 'no', '']) {
    assert.throws(() =>
      validateGroupHelpModerationNoticeSetting('telegramGroupHelpModNoticeSeconds', value)
    );
    assert.equal(
      groupHelpModerationNoticePolicy({ telegramGroupHelpModNoticeSeconds: value }).seconds,
      86400
    );
  }
  assert.throws(() => validateGroupHelpModerationNoticeSetting('telegramGroupHelpModFooter', '  '));
});

test('long reasons cannot displace the feedback notice or exceed the message limit', () => {
  const text = groupHelpModerationNoticeText('😀'.repeat(4000), 'ban');
  assert.ok(text.length <= 4096);
  assert.ok(text.endsWith(GROUP_HELP_MODERATION_FEEDBACK_NOTICE));
  assert.equal(text.includes('\uFFFD'), false);
});

test('bot notice edits update only the selected group and preserve its other policies', async (t) => {
  const rows = new Map([
    ['group-a', { unrelated: 'keep' }],
    ['group-b', { unrelated: 'other' }]
  ]);
  const delegate = prisma.telegramCommunityGroupPolicy;
  const originalFind = delegate.findUnique,
    originalUpsert = delegate.upsert;
  const writes: string[] = [];
  delegate.findUnique = (async ({ where }: { where: { chatId: string } }) => ({
    settings: rows.get(where.chatId)
  })) as unknown as typeof delegate.findUnique;
  delegate.upsert = (async ({
    where,
    update
  }: {
    where: { chatId: string };
    update: { settings: Record<string, string> };
  }) => {
    writes.push(where.chatId);
    rows.set(where.chatId, update.settings as { unrelated: string });
    return {};
  }) as unknown as typeof delegate.upsert;
  t.after(() => {
    delegate.findUnique = originalFind;
    delegate.upsert = originalUpsert;
  });
  const field = GROUP_HELP_MOD_NOTICE_FIELDS.find(
    (f) => f.key === 'telegramGroupHelpModNoticeSeconds'
  )!;
  await saveGroupHelpBotSetting(field, '3600', 'group-a');
  assert.deepEqual(rows.get('group-a'), {
    unrelated: 'keep',
    telegramGroupHelpModNoticeSeconds: '3600'
  });
  assert.deepEqual(rows.get('group-b'), { unrelated: 'other' });
  await assert.rejects(saveGroupHelpBotSetting(field, '86401', 'group-a'), /Retention/);
  assert.deepEqual(writes, ['group-a']);
});
