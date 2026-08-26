import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_COMMUNITY_VC_TOPIC_ROOTS,
  GROUP_HELP_CONFIG_META
} from '../constants/group-help-config.constants.js';
import {
  buildVcTopicCatalog,
  indiaDateKey,
  indiaDayWindow,
  selectUnusedVcTopics,
  vcTopicPublicBoard,
  vcTopicStaffBoard,
  type VcTopicPlanPayload
} from './telegram-community-vc-topics.js';

const plan: VcTopicPlanPayload = {
  version: 1,
  dateKey: '2026-08-26',
  groupChatId: '-100-main',
  staffChatId: '-100-staff',
  topicLibraryHash: 'test',
  slots: [
    {
      eventId: 'event-one',
      startsAt: '2026-08-26T13:30:00.000Z',
      topic: 'Let’s talk about setting boundaries without guilt'
    },
    {
      eventId: 'event-two',
      startsAt: '2026-08-26T15:30:00.000Z',
      topic: 'What helps with handling loneliness?',
      assignment: {
        telegramUserId: '42',
        name: 'Mind Craft',
        username: 'spiritualspirit',
        selectedAt: '2026-08-26T04:00:00.000Z'
      }
    }
  ]
};

test('India VC planning uses the correct calendar day around UTC midnight', () => {
  const now = new Date('2026-08-25T20:00:00.000Z');
  assert.equal(indiaDateKey(now), '2026-08-26');
  const window = indiaDayWindow(now);
  assert.equal(window.start.toISOString(), '2026-08-25T18:30:00.000Z');
  assert.equal(window.end.toISOString(), '2026-08-26T18:30:00.000Z');
});

test('topic catalog creates distinct safe variants and excludes every previously used title', () => {
  const catalog = buildVcTopicCatalog('setting boundaries\nhandling loneliness');
  assert.equal(catalog.length, 20);
  assert.equal(new Set(catalog).size, catalog.length);
  const used = catalog.slice(0, 19);
  const selected = selectUnusedVcTopics({
    rootsValue: 'setting boundaries\nhandling loneliness',
    usedTopics: used,
    count: 5,
    dateKey: '2026-08-26'
  });
  assert.deepEqual(selected, [catalog[19]]);
});

test('managed topic library covers the full 90-day five-VC schedule and remains admin editable', () => {
  assert.ok(buildVcTopicCatalog(DEFAULT_COMMUNITY_VC_TOPIC_ROOTS).length >= 450);
  assert.equal(GROUP_HELP_CONFIG_META.telegramCommunityVcTopicPlannerEnabled.type, 'select');
  assert.equal(GROUP_HELP_CONFIG_META.telegramCommunityVcTopicPromptTime.defaultValue, '09:00');
  assert.equal(GROUP_HELP_CONFIG_META.telegramCommunityVcTopicRoots.type, 'textarea');
});

test('staff topic board keeps two choice buttons per row and exposes assignment status', () => {
  const board = vcTopicStaffBoard(plan);
  assert.match(board.text, /Selected by: Mind Craft/);
  assert.equal(board.keyboard.inline_keyboard.length, 1);
  assert.equal(board.keyboard.inline_keyboard[0].length, 2);
  assert.equal(board.keyboard.inline_keyboard[0][0].callback_data, 'vc_claim:event-one');
});

test('public board lets a member RSVP independently to every VC time', () => {
  const board = vcTopicPublicBoard(plan, { 'event-one': 3, 'event-two': 7 });
  assert.match(board.text, /Host: Mind Craft/);
  assert.equal(board.keyboard.inline_keyboard[0][0].callback_data, 'vc_rsvp:event-one');
  assert.equal(board.keyboard.inline_keyboard[0][1].callback_data, 'vc_rsvp:event-two');
  assert.match(board.keyboard.inline_keyboard[0][0].text, /Join \(3\)/);
  assert.match(board.keyboard.inline_keyboard[0][1].text, /Join \(7\)/);
});
