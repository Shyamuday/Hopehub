import assert from 'node:assert/strict';
import test from 'node:test';
import { GROUP_HELP_WELLBEING_FILTERS } from '../constants/group-help-wellbeing-replies.constants.js';
import { parseGroupHelpFilters } from './telegram-group-help.filters.js';
import {
  bannedPhrases,
  matchedBannedPhrase,
  resolveGroupHelpConfigValues
} from './telegram-group-help.config.js';

test('ignores broad ordinary terms in stored moderation word lists', () => {
  assert.deepEqual(
    bannedPhrases(
      'spam\nds\nDM\npm\nmessage\nprivate\nwhatsapp\nservice\ndepression\nanxiety\nlonely\nbreakup\nsex\nunsafe link'
    ),
    ['spam', 'unsafe link']
  );
});

test('ignores standalone service without weakening specific unsafe service phrases', () => {
  const phrases = bannedPhrases('service\nescort service\nsexy service');

  assert.deepEqual(phrases, ['escort service', 'sexy service']);
  assert.equal(matchedBannedPhrase('Hope Hub is not an emergency service.', phrases), null);
  assert.equal(
    matchedBannedPhrase('They advertised an escort service here.', phrases),
    'escort service'
  );
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
