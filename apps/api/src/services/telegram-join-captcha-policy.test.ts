import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captchaNeedsStaffReview,
  canDecideCaptchaReview,
  joinCaptchaAnswerAllowed,
  joinCaptchaEnabled,
  joinWelcomeCleanupDelay,
  joinWelcomeDeleteAfter,
  joinVerificationMatches,
  captchaReviewRetryDelay,
  captchaReviewReady,
  joinCaptchaSettingVisible,
  keepPendingCaptchaMessage,
  verifiedJoinKeyboard,
  withoutJoinCaptchaQuestion
} from './telegram-join-captcha-policy.js';

test('verification removes only challenge buttons and preserves mixed rows and button styles', () => {
  const help = { text: 'Help', url: 'https://example.com/help', style: 'success' as const };
  const menu = { text: 'Menu', callback_data: 'hh_menu:home' };
  const keyboard = {
    inline_keyboard: [
      [{ text: '4', callback_data: 'hh_join_captcha:-1:2:4:test' }],
      [{ text: 'Verify', callback_data: 'hh_join_verify:-1:2:test' }, help],
      [menu]
    ]
  };
  assert.deepEqual(verifiedJoinKeyboard(keyboard), { inline_keyboard: [[help], [menu]] });
  assert.equal(keyboard.inline_keyboard[0]?.length, 1);
  assert.deepEqual(verifiedJoinKeyboard(), { inline_keyboard: [] });
});

test('verification removes the appended captcha question without changing welcome HTML', () => {
  const welcome = '<b>Welcome</b>\nRead our rules.';
  assert.equal(
    withoutJoinCaptchaQuestion(
      `${welcome}\n\nTo join the conversation, choose the answer: 3 + 7 = ?`
    ),
    welcome
  );
  assert.equal(withoutJoinCaptchaQuestion(welcome), welcome);
});

test('old verification and admin buttons cannot act on a rejoined member', () => {
  for (const prefix of ['hh_join_allow', 'hh_join_reject', 'hh_join_verify']) {
    assert.equal(joinVerificationMatches(`${prefix}:-1:2:old`, 'new'), false);
    assert.equal(joinVerificationMatches(`${prefix}:-1:2:new`, 'new'), true);
    assert.equal(joinVerificationMatches(`${prefix}:-1:2`, 'new'), false);
  }
  assert.equal(joinVerificationMatches('hh_join_captcha:-1:2:7:old', 'new'), false);
  assert.equal(joinVerificationMatches('hh_join_captcha:-1:2:7:new', 'new'), true);
  assert.equal(joinVerificationMatches('hh_join_captcha:-1:2:7'), true);
  assert.ok(
    Buffer.byteLength('hh_join_captcha:-100123456789012:1234567890123456:16:1234567890') <= 64
  );
});
test('failed admin delivery becomes eligible for automatic retry without a user click', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  assert.equal(captchaReviewRetryDelay(1), 30_000);
  assert.equal(captchaReviewRetryDelay(2), 60_000);
  assert.equal(captchaReviewRetryDelay(20), 3_600_000);
  const pending = { reviewRetryAt: new Date(now + 30_000).toISOString() };
  assert.equal(captchaReviewReady(pending, now), false);
  assert.equal(captchaReviewReady(pending, now + 30_000), true);
  assert.equal(captchaReviewReady({ ...pending, reviewMessageId: 12 }, now + 60_000), false);
});
test('restart recovery retains the original thirty-second deadline and allows completed-message cleanup', () => {
  const completed = '2026-10-06T12:00:00Z';
  assert.equal(
    joinWelcomeDeleteAfter(completed, 7, 5, Date.parse('2026-10-06T12:05:00Z')).toISOString(),
    '2026-10-06T12:00:30.000Z'
  );
  assert.equal(
    keepPendingCaptchaMessage({ captchaAnswer: 7, welcomeMessageId: 3 }, 3, 'join-completed'),
    false
  );
  assert.equal(
    keepPendingCaptchaMessage(
      { captchaAnswer: 7, welcomeMessageId: 3 },
      3,
      'awaiting-admin-approval'
    ),
    true
  );
});

test('completed captcha welcome is deleted after thirty seconds regardless of the legacy minutes setting', () => {
  assert.equal(joinWelcomeCleanupDelay(7, 5), 30_000);
  assert.equal(joinWelcomeCleanupDelay(0, 60), 30_000);
  assert.equal(joinWelcomeCleanupDelay(null, 5), 300_000);
});

test('captcha settings apply to captcha and strict onboarding only when enabled', () => {
  for (const protection of ['captcha', 'strict']) {
    const values = {
      telegramGroupHelpJoinProtection: protection,
      telegramGroupHelpCaptchaMode: 'on'
    };
    assert.equal(joinCaptchaEnabled(values), true);
    assert.equal(joinCaptchaSettingVisible('telegramGroupHelpNewMemberAction', values), true);
    assert.equal(
      joinCaptchaSettingVisible('telegramGroupHelpCaptchaPendingMinutes', values),
      false
    );
    values.telegramGroupHelpCaptchaMode = 'off';
    assert.equal(joinCaptchaSettingVisible('telegramGroupHelpNewMemberAction', values), false);
    assert.equal(
      joinCaptchaSettingVisible('telegramGroupHelpCaptchaSuccessCleanupMinutes', values),
      false
    );
  }
  assert.equal(joinCaptchaEnabled({ telegramGroupHelpJoinProtection: 'off' }), false);
});
test('three wrong answers escalate while disabled captcha and confirmation-only joins do not', () => {
  assert.equal(captchaNeedsStaffReview(7, 1, true), false);
  assert.equal(captchaNeedsStaffReview(7, 2, true), false);
  assert.equal(captchaNeedsStaffReview(7, 3, true), true);
  assert.equal(captchaNeedsStaffReview(7, 4, true), true);
  assert.equal(captchaNeedsStaffReview(7, 3, false), false);
  assert.equal(captchaNeedsStaffReview(null, 3, true), false);
});

test('configured captcha limits and cleanup timing apply without changing confirmation-only joins', () => {
  assert.equal(captchaNeedsStaffReview(7, 3, true, 5), false);
  assert.equal(captchaNeedsStaffReview(7, 5, true, 5), true);
  assert.equal(captchaNeedsStaffReview(7, 1, true, 1), true);
  assert.equal(joinWelcomeCleanupDelay(7, 5, 90), 90_000);
  assert.equal(joinWelcomeCleanupDelay(null, 5, 90), 300_000);
  assert.equal(
    joinWelcomeDeleteAfter('2026-10-06T12:00:00Z', 7, 5, Date.now(), 90).toISOString(),
    '2026-10-06T12:01:30.000Z'
  );
  for (const key of [
    'telegramGroupHelpCaptchaMaxAttempts',
    'telegramGroupHelpCaptchaSuccessCleanupSeconds'
  ]) {
    assert.equal(
      joinCaptchaSettingVisible(key, { telegramGroupHelpJoinProtection: 'captcha' }),
      true
    );
    assert.equal(joinCaptchaSettingVisible(key, { telegramGroupHelpCaptchaMode: 'off' }), false);
  }
});
test('confirmation callback cannot bypass a captcha; captcha callback cannot bypass confirmation', () => {
  assert.equal(joinCaptchaAnswerAllowed(7, 'hh_join_verify:-1:2'), false);
  assert.equal(joinCaptchaAnswerAllowed(7, 'hh_join_captcha:-1:2:7'), true);
  assert.equal(joinCaptchaAnswerAllowed(null, 'hh_join_captcha:-1:2:0'), false);
  assert.equal(joinCaptchaAnswerAllowed(null, 'hh_join_verify:-1:2'), true);
});
test('old cleanup jobs preserve only the unresolved captcha message', () => {
  assert.equal(keepPendingCaptchaMessage({ captchaAnswer: 7, welcomeMessageId: 3 }, 3), true);
  assert.equal(keepPendingCaptchaMessage({ captchaAnswer: 7, welcomeMessageId: 3 }, 4), false);
  assert.equal(keepPendingCaptchaMessage({ captchaAnswer: null, welcomeMessageId: 3 }, 3), false);
  assert.equal(keepPendingCaptchaMessage(null, 3), false);
});
test('only administrators in the configured staff group can accept or reject', () => {
  assert.equal(canDecideCaptchaReview('-2', '-2', 'administrator'), true);
  assert.equal(canDecideCaptchaReview('-2', '-2', 'creator'), true);
  assert.equal(canDecideCaptchaReview('-2', '-2', 'member'), false);
  assert.equal(canDecideCaptchaReview('-1', '-2', 'administrator'), false);
  assert.equal(canDecideCaptchaReview('', '', 'administrator'), false);
});
