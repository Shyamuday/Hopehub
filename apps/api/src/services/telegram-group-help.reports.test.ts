import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isGroupHelpReportTrigger,
  isTelegramGroupAdministratorStatus
} from './telegram-group-help.reports.js';

test('recognizes only the Rose report command and exact admin mention', () => {
  for (const text of [
    '/report',
    '/report spam',
    '/report@HopeHubBot reason',
    '@admin',
    '@admins'
  ]) {
    assert.equal(isGroupHelpReportTrigger(text), true, text);
  }
  for (const text of ['please @admin', '@administrator', '@adminsupport', '/reports']) {
    assert.equal(isGroupHelpReportTrigger(text), false, text);
  }
});

test('recognizes Telegram group administrator statuses', () => {
  assert.equal(isTelegramGroupAdministratorStatus('creator'), true);
  assert.equal(isTelegramGroupAdministratorStatus('administrator'), true);
  assert.equal(isTelegramGroupAdministratorStatus('member'), false);
  assert.equal(isTelegramGroupAdministratorStatus(undefined), false);
});
