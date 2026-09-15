import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isGroupHelpRulesRequest,
  isGroupHelpModerationKeywordRequest
} from './telegram-group-help.rules-message.js';

test('recognizes singular and plural plain rules requests without matching conversation text', () => {
  for (const value of ['rule', 'rules', ' Rule ', 'RULES!', 'rules?']) {
    assert.equal(isGroupHelpRulesRequest(value), true, value);
  }
  for (const value of [
    'group rules',
    'please show rules',
    '/rules',
    'rules are important',
    'ruler'
  ]) {
    assert.equal(isGroupHelpRulesRequest(value), false, value);
  }
});

test('recognizes plain moderation keyword requests without matching conversation text', () => {
  for (const value of [
    'ban',
    'Ban',
    'BAN',
    'ban!',
    'ban?',
    'ban.',
    'unban',
    'mute',
    'unmute',
    'warn',
    'unwarn',
    'kick',
    'block',
    'report',
    ' Mute ',
    ' WARN! '
  ]) {
    assert.equal(isGroupHelpModerationKeywordRequest(value), true, value);
  }
  for (const value of [
    'please ban him',
    'i got banned',
    '/ban',
    'ban list',
    'unban me please',
    'muting someone',
    'warning message',
    'banned'
  ]) {
    assert.equal(isGroupHelpModerationKeywordRequest(value), false, value);
  }
});
