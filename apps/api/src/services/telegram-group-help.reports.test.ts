import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpReportedMessageEvidence,
  isGroupHelpAdminReportTrigger,
  isGroupHelpReportTrigger,
  isTelegramGroupAdministratorStatus,
  telegramGroupMessageUrl
} from './telegram-group-help.reports.js';

test('recognizes only the Rose report command and exact admin mention', () => {
  for (const text of [
    '/report',
    '/report spam',
    '/report@HopeHubBot reason',
    'admin',
    'admins',
    '@admin',
    '@admins',
    '@admnn',
    '@admnns'
  ]) {
    assert.equal(isGroupHelpReportTrigger(text), true, text);
  }
  for (const text of [
    'please @admin',
    'admin please',
    '@administrator',
    '@adminsupport',
    '/reports'
  ]) {
    assert.equal(isGroupHelpReportTrigger(text), false, text);
  }
});

test('distinguishes admin shortcuts from the /report command for rules delivery', () => {
  for (const text of ['admin', 'admins', '@admin', '@admins', '@admnn']) {
    assert.equal(isGroupHelpAdminReportTrigger(text), true, text);
  }
  assert.equal(isGroupHelpAdminReportTrigger('/report'), false);
});

test('recognizes Telegram group administrator statuses', () => {
  assert.equal(isTelegramGroupAdministratorStatus('creator'), true);
  assert.equal(isTelegramGroupAdministratorStatus('administrator'), true);
  assert.equal(isTelegramGroupAdministratorStatus('member'), false);
  assert.equal(isTelegramGroupAdministratorStatus(undefined), false);
});

test('builds links to public and private group messages', () => {
  assert.equal(
    telegramGroupMessageUrl({ id: -1001234567890, username: 'hopehubindia' }, 42),
    'https://t.me/hopehubindia/42'
  );
  assert.equal(telegramGroupMessageUrl({ id: -1001234567890 }, 42), 'https://t.me/c/1234567890/42');
  assert.equal(telegramGroupMessageUrl({ id: -12345 }, 42), '');
});

test('shows the reported content and media type in staff evidence', () => {
  const evidence = groupHelpReportedMessageEvidence({
    message_id: 42,
    chat: { id: -1001234567890 },
    from: { id: 7, first_name: 'Member' },
    caption: 'This is the reported caption.',
    photo: [{ file_id: 'photo-id' }]
  });
  assert.equal(evidence, 'Reported photo:\nThis is the reported caption.');
});
