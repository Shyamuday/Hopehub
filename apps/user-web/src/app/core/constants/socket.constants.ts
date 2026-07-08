export const SOCKET_EVENTS = {
  SUBSCRIBE_CONSULTATION: 'subscribe:consultation',
  SUBSCRIBE_ONLINE_DOCTORS: 'subscribe:online-doctors',
  DOCTOR_PRESENCE: 'doctor:presence',
  DOCTOR_OFFLINE: 'doctor:offline'
} as const;

export const SOCKET_TRANSPORTS = ['websocket'] as const;
