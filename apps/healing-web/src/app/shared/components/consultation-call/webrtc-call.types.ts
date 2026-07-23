export type CallMode = 'audio' | 'video';

export type CallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'error';

export type IceServerConfig = { urls: string | string[]; username?: string; credential?: string };

export type CallSignalingSocket = {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler?: (...args: unknown[]) => void): void;
  emit(event: string, payload?: unknown): void;
};

export type PendingOffer = {
  fromUserId: string;
  consultationId: string;
  sdp: RTCSessionDescriptionInit;
  mode: CallMode;
};

export const CALL_SOCKET_EVENTS = {
  OFFER: 'call:offer',
  ANSWER: 'call:answer',
  ICE: 'call:ice-candidate',
  END: 'call:end',
  REJECT: 'call:reject',
  RING: 'call:ring',
} as const;
