import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GROUP_COMMAND_DELETE_SECONDS,
  groupCommandDeleteDelaySeconds,
  shouldAutoDeleteGroupCommand,
  shouldDeleteModerationTarget
} from './telegram-group-help.command-cleanup.js';

test('group commands default to a short cleanup delay and clamp configured values', () => {
  assert.equal(groupCommandDeleteDelaySeconds(undefined), DEFAULT_GROUP_COMMAND_DELETE_SECONDS);
  assert.equal(groupCommandDeleteDelaySeconds('4.9'), 4);
  assert.equal(groupCommandDeleteDelaySeconds('-1'), 0);
  assert.equal(groupCommandDeleteDelaySeconds('1000'), 60);
});

test('only commands in public group chats are automatically removed', () => {
  assert.equal(
    shouldAutoDeleteGroupCommand({
      chatType: 'supergroup',
      isControlGroup: false,
      delaySeconds: 3
    }),
    true
  );
  assert.equal(
    shouldAutoDeleteGroupCommand({ chatType: 'private', isControlGroup: false, delaySeconds: 3 }),
    false
  );
  assert.equal(
    shouldAutoDeleteGroupCommand({ chatType: 'supergroup', isControlGroup: true, delaySeconds: 3 }),
    false
  );
  assert.equal(
    shouldAutoDeleteGroupCommand({
      chatType: 'supergroup',
      isControlGroup: false,
      delaySeconds: 0
    }),
    false
  );
});

test('plain moderation keeps member content unless deletion is explicit', () => {
  for (const command of ['warn', 'mute', 'ban', 'kick', 'unwarn', 'unmute', 'unban']) {
    assert.equal(shouldDeleteModerationTarget(command), false, command);
  }
  for (const command of ['delete', 'del', 'delwarn', 'delmute', 'delban', 'delkick']) {
    assert.equal(shouldDeleteModerationTarget(command), true, command);
  }
});
