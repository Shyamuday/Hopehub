import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterControlOptions,
  groupHelpFilterCommandSuggestions,
  groupHelpFilterMediaFromMessage,
  matchingGroupHelpFilter,
  parseGroupHelpFilterCommand,
  parseGroupHelpFilters,
  renderGroupHelpFilterHtml,
  renderGroupHelpFilterText,
  serializeGroupHelpFilters
} from './telegram-group-help.filters.js';

test('parses single, quoted, typed, and multi-trigger Rose filter commands', () => {
  assert.deepEqual(parseGroupHelpFilterCommand('/filter puppies I love puppies!'), {
    triggers: [{ value: 'puppies', mode: 'contains' }],
    response: 'I love puppies!'
  });
  assert.deepEqual(parseGroupHelpFilterCommand('/filter "exact:hi there" Please ask a question'), {
    triggers: [{ value: 'hi there', mode: 'exact' }],
    response: 'Please ask a question'
  });
  assert.deepEqual(
    parseGroupHelpFilterCommand('/filter (hi, hello, "hi there", prefix:/help) Welcome!')?.triggers,
    [
      { value: 'hi', mode: 'contains' },
      { value: 'hello', mode: 'contains' },
      { value: 'hi there', mode: 'contains' },
      { value: '/help', mode: 'prefix' }
    ]
  );
});

test('extracts audience, bot, and command controls without exposing them in replies', () => {
  assert.deepEqual(filterControlOptions('Hello {user} {allow_bot} {command Website info}'), {
    text: 'Hello',
    audience: 'users',
    allowBots: true,
    commandDescription: 'Website info'
  });
});

test('captures the highest-quality photo or replied media for media filters', () => {
  assert.deepEqual(
    groupHelpFilterMediaFromMessage({
      message_id: 1,
      chat: { id: -1 },
      photo: [{ file_id: 'small' }, { file_id: 'large' }]
    }),
    { type: 'photo', fileId: 'large' }
  );
  assert.deepEqual(
    groupHelpFilterMediaFromMessage({
      message_id: 2,
      chat: { id: -1 },
      sticker: { file_id: 'sticker-id' }
    }),
    { type: 'sticker', fileId: 'sticker-id' }
  );
});

test('round-trips filters and keeps established Hope Hub definitions readable', () => {
  const legacy = parseGroupHelpFilters(
    'read rules => Please read /rules => Read rules => https://hopehub.in/rules'
  );
  assert.equal(legacy.filters[0].triggers[0].value, 'read rules');
  assert.deepEqual(legacy.filters[0].button, {
    text: 'Read rules',
    url: 'https://hopehub.in/rules'
  });
  const serialized = serializeGroupHelpFilters(legacy.filters, legacy.passthrough);
  assert.deepEqual(parseGroupHelpFilters(serialized).filters, legacy.filters);
});

test('matches contains, prefix and exact filters with audience and bot controls', () => {
  const definitions = serializeGroupHelpFilters([
    {
      triggers: [{ value: 'hello', mode: 'exact' }],
      text: 'exact',
      audience: 'all',
      allowBots: false
    },
    {
      triggers: [{ value: '/site', mode: 'prefix' }],
      text: 'site',
      audience: 'admins',
      allowBots: false
    }
  ]);
  assert.equal(
    matchingGroupHelpFilter({
      text: 'hello',
      definitions,
      senderIsBot: false,
      senderIsAdmin: false
    })?.text,
    'exact'
  );
  assert.equal(
    matchingGroupHelpFilter({
      text: 'hello everyone',
      definitions,
      senderIsBot: false,
      senderIsAdmin: false
    }),
    undefined
  );
  assert.equal(
    matchingGroupHelpFilter({
      text: '/site now',
      definitions,
      senderIsBot: false,
      senderIsAdmin: true
    })?.text,
    'site'
  );
});

test('renders safe member fillings and exposes only valid slash-command suggestions', () => {
  const filter = {
    triggers: [{ value: '/website', mode: 'contains' as const }],
    text: 'Hi {first}; {replytag}',
    audience: 'all' as const,
    allowBots: false,
    commandDescription: 'Open website'
  };
  const message = {
    message_id: 2,
    chat: { id: -1, title: 'Hope Hub' },
    from: { id: 10, first_name: 'A_user' },
    reply_to_message: {
      message_id: 1,
      chat: { id: -1 },
      from: { id: 20, first_name: 'Friend' }
    }
  };
  assert.equal(
    renderGroupHelpFilterText(filter, message),
    'Hi A\\_user; [Friend](tg://user?id=20)'
  );
  assert.deepEqual(groupHelpFilterCommandSuggestions(serializeGroupHelpFilters([filter])), [
    { command: 'website', description: 'Open website' }
  ]);
  assert.equal(
    renderGroupHelpFilterHtml('Hi {first}; {username}', {
      ...message,
      from: { id: 10, first_name: '<Admin>', username: undefined }
    }),
    'Hi &lt;Admin&gt;; <a href="tg://user?id=10">&lt;Admin&gt;</a>'
  );
});
