export type HopeHubQuickTalkMode = 'chat' | 'voice' | 'video';

export function normalizeQuickTalkMode(value: unknown): HopeHubQuickTalkMode {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('video')) return 'video';
  if (raw.includes('chat') || raw.includes('message')) return 'chat';
  return 'voice';
}

export function requestedQuickTalkMode(value: unknown): HopeHubQuickTalkMode | null {
  return String(value || '').trim() ? normalizeQuickTalkMode(value) : null;
}

export function quickTalkSessionModeLabel(mode: HopeHubQuickTalkMode) {
  if (mode === 'chat') return 'live_chat';
  if (mode === 'video') return 'online_video';
  return 'online_audio';
}

export function quickTalkModeWhere(mode: HopeHubQuickTalkMode) {
  if (mode === 'chat') return { acceptsChat: true };
  if (mode === 'video') return { acceptsVideoCall: true };
  return { acceptsVoiceCall: true };
}

export function quickTalkAvailabilityWhere(value: unknown) {
  const mode = requestedQuickTalkMode(value);
  return mode
    ? quickTalkModeWhere(mode)
    : {
        OR: [{ acceptsChat: true }, { acceptsVoiceCall: true }, { acceptsVideoCall: true }]
      };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizedCallMode(value: unknown): 'audio' | 'video' | '' {
  const text = String(value || '').toLowerCase();
  if (text.includes('video')) return 'video';
  if (text.includes('voice') || text.includes('audio') || text.includes('call')) return 'audio';
  return '';
}

export function consultationAllowsCallMode(
  intakeAnswers: unknown,
  requestedMode?: string
): boolean {
  const mode = normalizedCallMode(requestedMode);
  if (!mode) return true;

  const intake = asRecord(intakeAnswers);
  const allowedSessionModes = Array.isArray(intake['allowedSessionModes'])
    ? intake['allowedSessionModes'].map((value) => String(value).toLowerCase())
    : [];
  const requestedSessionMode = mode === 'audio' ? 'voice' : mode;
  if (allowedSessionModes.length) return allowedSessionModes.includes(requestedSessionMode);

  const sessionMode = normalizedCallMode(
    intake['quickTalkMode'] || intake['sessionMode'] || intake['mode']
  );
  const rawSessionMode = String(
    intake['quickTalkMode'] || intake['sessionMode'] || intake['mode'] || ''
  ).toLowerCase();
  if (rawSessionMode.includes('chat')) return false;
  if (sessionMode === 'audio' && mode === 'video') return false;
  return true;
}
