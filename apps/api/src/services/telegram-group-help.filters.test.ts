import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterControlOptions,
  groupHelpFilterCooldownSeconds,
  groupHelpFilterCommandSuggestions,
  groupHelpFilterMediaFromMessage,
  matchingGroupHelpFilter,
  parseGroupHelpFilterCommand,
  parseGroupHelpFilters,
  renderGroupHelpFilterHtml,
  renderGroupHelpFilterText,
  serializeGroupHelpFilters
} from './telegram-group-help.filters.js';
import {
  GROUP_HELP_WELLBEING_FILTERS,
  GROUP_HELP_WELLBEING_FILTER_DEFINITIONS,
  withGroupHelpWellbeingFilterDefaults
} from '../constants/group-help-wellbeing-replies.constants.js';

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

test('round-trips wellbeing safety metadata and remote photo media', () => {
  const filters = parseGroupHelpFilters(GROUP_HELP_WELLBEING_FILTER_DEFINITIONS).filters;
  assert.equal(filters.length, 4);
  assert.equal(filters[0].id, 'hopehub-immediate-support-v1');
  assert.equal(filters[0].category, 'crisis');
  assert.equal(filters[0].cooldownSeconds, undefined);
  assert.equal(filters[0].notifyStaff, true);
  assert.match(filters[0].media?.fileId || '', /^https:\/\/.*\.png$/);
});

test('wellbeing defaults match support-seeking phrases without matching broad discussion', () => {
  const match = (text: string) =>
    matchingGroupHelpFilter({
      text,
      definitions: GROUP_HELP_WELLBEING_FILTER_DEFINITIONS,
      senderIsBot: false,
      senderIsAdmin: false
    });

  assert.equal(match('I think I may have a panic attack')?.id, 'hopehub-anxiety-support-v1');
  assert.equal(match('I am feeling hopeless today')?.id, 'hopehub-low-mood-support-v1');
  assert.equal(match('I need someone to talk to')?.id, 'hopehub-loneliness-support-v1');
  assert.equal(match('Mujhe bahut ghabrahat ho rahi hai')?.id, 'hopehub-anxiety-support-v1');
  assert.equal(match('Mujhe jeena nahi hai')?.id, 'hopehub-immediate-support-v1');
  assert.equal(match('We are discussing depression awareness'), undefined);
  assert.equal(match('This article explains anxiety'), undefined);
  assert.equal(
    matchingGroupHelpFilter({
      text: 'I want to die',
      definitions: GROUP_HELP_WELLBEING_FILTER_DEFINITIONS,
      senderIsBot: false,
      senderIsAdmin: true
    })?.id,
    'hopehub-immediate-support-v1'
  );
});

test('crisis defaults never suppress repeated safety responses with a cooldown', () => {
  const crisis = GROUP_HELP_WELLBEING_FILTERS.find((filter) => filter.category === 'crisis');
  assert.ok(crisis);
  assert.equal(crisis.cooldownSeconds, undefined);
  assert.equal(groupHelpFilterCooldownSeconds({ ...crisis, cooldownSeconds: 1800 }), 0);
});

test('can limit matching to crisis filters for priority handling', () => {
  assert.equal(
    matchingGroupHelpFilter({
      text: 'suicide',
      definitions: GROUP_HELP_WELLBEING_FILTER_DEFINITIONS,
      senderIsBot: false,
      senderIsAdmin: false,
      category: 'crisis'
    })?.id,
    'hopehub-immediate-support-v1'
  );
  assert.equal(
    matchingGroupHelpFilter({
      text: 'I am lonely',
      definitions: GROUP_HELP_WELLBEING_FILTER_DEFINITIONS,
      senderIsBot: false,
      senderIsAdmin: false,
      category: 'crisis'
    }),
    undefined
  );
});

test('restores missing safety filters without replacing an edited filter with the same id', () => {
  const existing =
    'rose-filter:{"id":"hopehub-immediate-support-v1","category":"crisis","triggers":[{"value":"suicide","mode":"contains"}],"text":"Edited safety reply","audience":"all","allowBots":false}';
  const definitions = withGroupHelpWellbeingFilterDefaults(existing);
  const parsed = parseGroupHelpFilters(definitions).filters;

  assert.equal(parsed.filter((filter) => filter.id === 'hopehub-immediate-support-v1').length, 1);
  assert.equal(
    parsed.find((filter) => filter.id === 'hopehub-immediate-support-v1')?.text,
    'Edited safety reply'
  );
  assert.equal(parsed.length, 4);
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
