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
      'Kick member',
      'Ban member',
      'Delete message',
      'Delete + mute',
      'Reply with notice',
      'Dismiss'
    ]
  );
  assert.deepEqual(
    buttons.map((button) => button.callback_data.split(':').at(-1)),
    ['warn', 'mute', 'mute24h', 'kick', 'ban', 'delete', 'deletemute', 'reply', 'dismiss']
  );
});

test('cross-group review omits message actions when no source message is known', () => {
  const buttons = groupHelpModerationReviewButtons('case-2', false);
  assert.deepEqual(
    buttons.map((button) => button.text),
    ['Warn', 'Mute 1 hour', 'Mute 24 hours', 'Kick member', 'Ban member', 'Dismiss']
  );
});
