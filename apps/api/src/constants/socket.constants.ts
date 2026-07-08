export const SOCKET_EVENTS = {
  SUBSCRIBE_CONSULTATION: 'subscribe:consultation',
  SUBSCRIBE_ONLINE_DOCTORS: 'subscribe:online-doctors',
  CONSULTATION_UPDATED: 'consultation:updated',
  MESSAGE_NEW: 'message:new',
  PRESCRIPTION_NEW: 'prescription:new',
  PAYMENT_UPDATED: 'payment:updated',
  CONSULTATION_ASSIGNED: 'consultation:assigned',
  NOTIFICATION_NEW: 'notification:new',
  DOCTOR_PRESENCE: 'doctor:presence',
  DOCTOR_OFFLINE: 'doctor:offline',
  DOCTOR_HEARTBEAT: 'doctor:heartbeat',
  CALL_OFFER: 'call:offer',
  CALL_ANSWER: 'call:answer',
  CALL_ICE: 'call:ice-candidate',
  CALL_END: 'call:end',
  CALL_REJECT: 'call:reject',
  CALL_RING: 'call:ring'
} as const;

export const SOCKET_ROOM_PREFIXES = {
  USER: 'user:',
  CONSULTATION: 'consultation:',
  STORE_STAFF: 'store-staff:',
  DOCTORS_LIVE: 'doctors:live',
  ONLINE_DOCTORS_WATCHERS: 'online-doctors:watchers'
} as const;
