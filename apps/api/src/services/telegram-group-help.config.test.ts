import assert from 'node:assert/strict';
import test from 'node:test';
import { GROUP_HELP_WELLBEING_FILTERS } from '../constants/group-help-wellbeing-replies.constants.js';
import { parseGroupHelpFilters } from './telegram-group-help.filters.js';
import { bannedPhrases, resolveGroupHelpConfigValues } from './telegram-group-help.config.js';

test('ignores the removed ds moderation trigger in stored word lists', () => {
  assert.deepEqual(bannedPhrases('spam\nds\nDS\nunsafe link'), ['spam', 'unsafe link']);
});

test('group policy keeps scalar overrides while required filters survive stale snapshots', () => {
  const existing = {
    id: 'hopehub-immediate-support-v1',
    category: 'crisis' as const,
    triggers: [{ value: 'suicide', mode: 'contains' as const }],
    text: 'Admin-edited crisis response',
    audience: 'all' as const,
    allowBots: false
  };
  const values = resolveGroupHelpConfigValues(
    {
      telegramGroupHelpLinkPolicy: 'delete',
      telegramGroupHelpCustomReplies: ''
    },
    {
      telegramGroupHelpLinkPolicy: 'allow',
      telegramGroupHelpCustomReplies: `rose-filter:${JSON.stringify(existing)}`
    }
  );

  assert.equal(values.telegramGroupHelpLinkPolicy, 'allow');
  const filters = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies).filters;
  assert.deepEqual(
    filters.map((filter) => filter.id).sort(),
    GROUP_HELP_WELLBEING_FILTERS.map((filter) => filter.id).sort()
  );
  assert.equal(
    filters.find((filter) => filter.id === existing.id)?.text,
    'Admin-edited crisis response'
  );
});
