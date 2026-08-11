export const LISTENER_GUIDELINES_VERSION = 'listener-guidelines-v1-2026-08-07';
export const LISTENER_TRAINING_VERSION = 'listener-training-v1-2026-08-07';

export const MINIMUM_LISTENER_GUIDELINES_READ_SECONDS = 5;
export const MAX_FAILED_LISTENER_SCREENING_ATTEMPTS = 3;
export const LISTENER_SCREENING_COOLDOWN_HOURS = 24;

export const AUTO_APPROVED_LISTENER_PRICING = {
  chatVoicePriceInPaise: 9900,
  videoPriceInPaise: 29900,
  durationMinutes: 30
} as const;
