import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TELEGRAM_COMMUNITY_CONTENT_COUNTS,
  TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS
} from './telegram-community-content.constants.js';

test('community engagement pool matches the configured content library', () => {
  assert.deepEqual(TELEGRAM_COMMUNITY_CONTENT_COUNTS, {
    quotes: 30,
    openQuestions: 30,
    anonymousSingleChoicePolls: 20,
    multipleAnswerPolls: 15,
    wellbeingQuizzes: 20,
    calmingActivities: 20,
    conversationStarters: 15,
    anonymousSharingReminders: 10,
    privateSupportReminders: 10
  });
  assert.equal(TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.length, 170);
  assert.equal(
    TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.filter((item) => item.kind === 'MESSAGE').length,
    115
  );
  assert.equal(
    TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.filter((item) => item.kind === 'POLL').length,
    55
  );
  assert.equal(
    TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS.filter(
      (item) => item.kind === 'POLL' && 'pollQuiz' in item && item.pollQuiz
    ).length,
    20
  );
});
