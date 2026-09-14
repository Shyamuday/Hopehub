import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isGroupHelpAdminReportTrigger,
  isGroupHelpReportTrigger,
  isTelegramGroupAdministratorStatus
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
