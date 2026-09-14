import assert from 'node:assert/strict';
import test from 'node:test';
import { isGroupHelpRulesRequest } from './telegram-group-help.rules-message.js';

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
