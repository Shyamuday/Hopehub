import assert from 'node:assert/strict';
import test from 'node:test';
import { customReplyAction } from './telegram-group-help.config.js';

test('custom reply action matches a configured phrase and exposes its button', () => {
  const action = customReplyAction(
    'Is anyone for talk right now?',
    'anyone for talk => Private support is available. => Talk live => https://hopehub.in/#live-connect'
  );

  assert.deepEqual(action, {
    trigger: 'anyone for talk',
    text: 'Private support is available.',
    buttonText: 'Talk live',
    buttonUrl: 'https://hopehub.in/#live-connect'
  });
});

test('custom reply action accepts a phrase with a reply and no button', () => {
  const action = customReplyAction(
    'Please read rules',
    'read rules => Please open the group rules.'
  );

  assert.deepEqual(action, {
    trigger: 'read rules',
    text: 'Please open the group rules.'
  });
});

test('custom reply action rejects a non-HTTPS button URL', () => {
  const action = customReplyAction(
    'Need help',
    'need help => Please contact the team. => Open support => http://example.test'
  );

  assert.deepEqual(action, {
    trigger: 'need help',
    text: 'Please contact the team.'
  });
});
