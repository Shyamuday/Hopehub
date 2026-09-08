export const EMPTY_VOICE_CHAT_TIMEOUT_MS = 5 * 60 * 1000;
export const VOICE_CHAT_OCCUPANCY_CHECK_INTERVAL_MS = 10 * 60 * 1000;
export const EMPTY_VOICE_CHAT_RECOVERY_MS = 60 * 1000;
export const EMPTY_VOICE_CHAT_RECOVERY_REASON =
  'Automatically closed after five continuously empty minutes';

// The production worker runs once per minute. A larger gap means Telegram's
// participant count was not observed continuously, so begin a fresh window
// instead of risking closure while the call's occupancy was unknown.
export const EMPTY_VOICE_CHAT_MAX_CHECK_GAP_MS = 7.5 * 60 * 1000;

export type EmptyVoiceTrackingPayload = {
  emptySince?: string;
  lastParticipantCheckAt?: string;
  participantCount?: number;
  startedBy?: VoiceParticipantSnapshot;
  emptyLeaveAlertedAt?: string;
};

export type VoiceParticipantSnapshot = {
  telegramUserId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

export function voiceStarterSnapshot(
  user:
    | {
        id: string | number;
        is_bot?: boolean;
        first_name?: string;
        last_name?: string;
        username?: string;
      }
    | null
    | undefined
): VoiceParticipantSnapshot | undefined {
  if (!user || user.is_bot) return undefined;
  return {
    telegramUserId: String(user.id),
    ...(user.first_name ? { firstName: user.first_name } : {}),
    ...(user.last_name ? { lastName: user.last_name } : {}),
    ...(user.username ? { username: user.username } : {})
  };
}

export type EmptyVoiceTrackingResult<T> = {
  payload: T & EmptyVoiceTrackingPayload;
  shouldClose: boolean;
};

function validTimestamp(value: string | undefined) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/**
 * Occupied calls use the low-frequency ten-minute check. Once an empty call
 * is observed, request the confirming check after five minutes.
 */
export function voiceChatOccupancyCheckDue(current: EmptyVoiceTrackingPayload, now: Date) {
  const priorCheck = validTimestamp(current.lastParticipantCheckAt);
  if (priorCheck == null || priorCheck > now.getTime()) return true;
  const interval = current.emptySince
    ? EMPTY_VOICE_CHAT_TIMEOUT_MS
    : VOICE_CHAT_OCCUPANCY_CHECK_INTERVAL_MS;
  return now.getTime() - priorCheck >= interval;
}

/**
 * Tracks a continuously empty Telegram voice chat. Any participant joining,
 * or a long gap in successful Telegram checks, restarts the five-minute timer.
 */
export function trackEmptyVoiceChat<T extends EmptyVoiceTrackingPayload>(
  current: T,
  participantCount: number,
  now: Date
): EmptyVoiceTrackingResult<T> {
  // A missing/malformed Telegram count is unknown, not zero. Do not advance
  // the closure timer until a trustworthy occupancy check succeeds.
  if (!Number.isFinite(participantCount)) {
    return { payload: current, shouldClose: false };
  }
  const normalizedCount = Math.max(0, Math.floor(participantCount));
  const checkedAt = now.toISOString();

  if (normalizedCount > 0) {
    const {
      emptySince: _emptySince,
      emptyLeaveAlertedAt: _emptyLeaveAlertedAt,
      ...occupiedPayload
    } = current;
    return {
      payload: {
        ...occupiedPayload,
        participantCount: normalizedCount,
        lastParticipantCheckAt: checkedAt
      } as T & EmptyVoiceTrackingPayload,
      shouldClose: false
    };
  }

  const priorEmptySince = validTimestamp(current.emptySince);
  const priorCheck = validTimestamp(current.lastParticipantCheckAt);
  const hasContinuousChecks =
    priorEmptySince != null &&
    priorCheck != null &&
    priorCheck <= now.getTime() &&
    now.getTime() - priorCheck <= EMPTY_VOICE_CHAT_MAX_CHECK_GAP_MS;
  const emptySince = hasContinuousChecks ? priorEmptySince : now.getTime();

  return {
    payload: {
      ...current,
      emptySince: new Date(emptySince).toISOString(),
      participantCount: 0,
      lastParticipantCheckAt: checkedAt
    },
    shouldClose: now.getTime() - emptySince >= EMPTY_VOICE_CHAT_TIMEOUT_MS
  };
}

/**
 * The Telegram service message identifies the administrator who started the
 * call. That person remains responsible for closing an empty VC regardless of
 * which ordinary member happened to leave last.
 */
export function knownVoiceStarterForEmptyAlert(
  current: EmptyVoiceTrackingPayload,
  participantCount: number
) {
  if (participantCount !== 0 || current.emptyLeaveAlertedAt || !current.startedBy) {
    return undefined;
  }
  return current.startedBy;
}
