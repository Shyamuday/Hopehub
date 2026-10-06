export function joinCaptchaEnabled(values: Record<string, string>) {
  return (
    ['captcha', 'strict'].includes(values.telegramGroupHelpJoinProtection || 'captcha') &&
    (values.telegramGroupHelpCaptchaMode || 'on') !== 'off'
  );
}

export function joinCaptchaSettingVisible(key: string, values: Record<string, string>) {
  const enabled = joinCaptchaEnabled(values);
  if (key === 'telegramGroupHelpCaptchaSuccessCleanupMinutes') return false;
  if (key === 'telegramGroupHelpCaptchaPendingMinutes') return !enabled;
  if (
    [
      'telegramGroupHelpNewMemberAction',
      'telegramGroupHelpCaptchaMaxAttempts',
      'telegramGroupHelpCaptchaSuccessCleanupSeconds'
    ].includes(key)
  )
    return enabled;
  return true;
}

export function joinCaptchaAnswerAllowed(answer: number | null | undefined, data: string) {
  return answer == null ? data.startsWith('hh_join_verify:') : data.startsWith('hh_join_captcha:');
}

export function joinWelcomeCleanupDelay(
  answer: number | null | undefined,
  fallbackMinutes: number,
  captchaCleanupSeconds = 30
) {
  return answer != null ? captchaCleanupSeconds * 1000 : fallbackMinutes * 60_000;
}

export function joinVerificationMatches(data: string, verificationId?: string) {
  const parts = data.split(':');
  const supplied = data.startsWith('hh_join_captcha:') ? parts[4] : parts[3];
  return verificationId ? supplied === verificationId : !supplied;
}

export function captchaReviewRetryDelay(attempts: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.min(Math.max(0, attempts - 1), 7));
}

export function captchaReviewReady(
  payload: { reviewMessageId?: number; reviewRetryAt?: string },
  now = Date.now()
) {
  return (
    !payload.reviewMessageId && (!payload.reviewRetryAt || Date.parse(payload.reviewRetryAt) <= now)
  );
}

export function joinWelcomeDeleteAfter(
  completedAt: string | undefined,
  answer: number | null | undefined,
  fallbackMinutes: number,
  now = Date.now(),
  captchaCleanupSeconds = 30
) {
  return new Date(
    (completedAt ? Date.parse(completedAt) : now) +
      joinWelcomeCleanupDelay(answer, fallbackMinutes, captchaCleanupSeconds)
  );
}

export function captchaNeedsStaffReview(
  answer: number | null | undefined,
  attempts: number,
  enabled: boolean,
  maxAttempts = 3
) {
  return answer != null && enabled && attempts >= maxAttempts;
}

export function canDecideCaptchaReview(
  callbackChatId: string,
  staffGroupId: string,
  status: string
) {
  return (
    Boolean(staffGroupId) &&
    callbackChatId === staffGroupId &&
    ['creator', 'administrator'].includes(status)
  );
}

export function keepPendingCaptchaMessage(payload: unknown, messageId: number, phase?: string) {
  if (phase === 'join-completed') return false;
  if (!payload || typeof payload !== 'object') return false;
  const state = payload as { captchaAnswer?: number | null; welcomeMessageId?: number };
  return state.captchaAnswer != null && state.welcomeMessageId === messageId;
}
