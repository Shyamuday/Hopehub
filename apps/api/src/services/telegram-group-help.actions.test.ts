import assert from 'node:assert/strict';
import test from 'node:test';
import { groupHelpModerationReviewButtons } from './telegram-group-help.actions.js';

test('automatic moderation review offers human actions without applying one', () => {
  const buttons = groupHelpModerationReviewButtons('case-1');
  assert.deepEqual(
    buttons.map((button) => button.text),
    [
      'Warn',
      'Mute 1 hour',
      'Mute 24 hours',
      'Delete message',
      'Delete + mute',
      'Reply with notice',
      'Dismiss'
    ]
  );
  assert.deepEqual(
    buttons.map((button) => button.callback_data.split(':').at(-1)),
    ['warn', 'mute', 'mute24h', 'delete', 'deletemute', 'reply', 'dismiss']
  );
});

test('cross-group review omits message actions when no source message is known', () => {
  const buttons = groupHelpModerationReviewButtons('case-2', false);
  assert.deepEqual(
    buttons.map((button) => button.text),
    ['Warn', 'Mute 1 hour', 'Mute 24 hours', 'Dismiss']
  );
});

test('deleted abusive messages offer warning removal and human mute decisions', () => {
  const buttons = groupHelpModerationReviewButtons('case-3', false, true);
  assert.deepEqual(
    buttons.map((button) => button.text),
    ['Remove warning', 'Mute 1 hour', 'Mute 24 hours', 'Dismiss']
  );
});
