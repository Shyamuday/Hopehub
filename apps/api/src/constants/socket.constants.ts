export const SOCKET_EVENTS = {
  SUBSCRIBE_CONSULTATION: 'subscribe:consultation',
  CONSULTATION_UPDATED: 'consultation:updated',
  MESSAGE_NEW: 'message:new',
  PRESCRIPTION_NEW: 'prescription:new',
  PAYMENT_UPDATED: 'payment:updated',
  CONSULTATION_ASSIGNED: 'consultation:assigned'
} as const;

export const SOCKET_ROOM_PREFIXES = {
  USER: 'user:',
  CONSULTATION: 'consultation:'
} as const;
