import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupHelpWarnPolicySummary,
  parseGroupHelpWarnMode,
  parseGroupHelpWarnTime
} from './telegram-group-help.warning-policy.js';

test('parses permanent and timed Rose warning modes', () => {
  assert.deepEqual(parseGroupHelpWarnMode('kick'), { action: 'kick', value: 'kick' });
  assert.deepEqual(parseGroupHelpWarnMode('tban 3d'), {
    action: 'ban',
    durationSeconds: 259_200,
    value: 'tban 3d'
  });
  assert.deepEqual(parseGroupHelpWarnMode('tmute 2H'), {
    action: 'mute',
    durationSeconds: 7200,
    value: 'tmute 2h'
  });
  assert.equal(parseGroupHelpWarnMode('tban'), undefined);
  assert.equal(parseGroupHelpWarnMode('delete'), undefined);
});

test('parses warning expiry and safely normalizes policy values', () => {
  assert.deepEqual(parseGroupHelpWarnTime('off'), { value: 'off', seconds: undefined });
  assert.deepEqual(parseGroupHelpWarnTime('12w'), { value: '12w', seconds: 7_257_600 });
  assert.equal(parseGroupHelpWarnTime('tomorrow'), undefined);
  assert.deepEqual(
    groupHelpWarnPolicySummary({
      telegramGroupHelpWarnLimit: '500',
      telegramGroupHelpWarnAction: 'invalid',
      telegramGroupHelpWarnTime: 'invalid'
    }),
    {
      limit: 100,
      mode: { action: 'mute', value: 'mute' },
      expiry: { value: 'off', seconds: undefined }
    }
  );
});
