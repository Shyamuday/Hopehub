export const ONLINE_HEARTBEAT_TTL_MS = 90_000;

export const ONLINE_DOCTOR_CATEGORY_LABELS = {
  GENERALIST: 'General physician',
  SPECIALIST: 'Disease specialist'
} as const;

export const LIVE_PRESENCE_LABELS = {
  OFFLINE: 'Offline',
  ONLINE: 'Online',
  BUSY: 'In consultation',
  ON_CALL: 'On a call'
} as const;

export const PUBLIC_STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
