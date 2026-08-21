export type CallMode = 'audio' | 'video';

export type CallState =
  'idle' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'error';

export type IceServerConfig = { urls: string | string[]; username?: string; credential?: string };

export type MediaAccessResult = { granted: boolean; message?: string };

export type CallNetworkType =
  'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'none' | 'other' | 'unknown';

export type CallNetworkProfile = {
  type: CallNetworkType;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  rttMs?: number;
  downlinkMbps?: number;
  saveData: boolean;
  requiresRelay: boolean;
};

export type CallSignalingSocket = {
  connected?: boolean;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler?: (...args: unknown[]) => void): void;
  emit(event: string, payload?: unknown): void;
};

export type PendingOffer = {
  callId: string;
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
  RING_ACK: 'call:ring-ack',
  SYNC: 'call:sync',
  STATE: 'call:state',
  HEARTBEAT: 'call:heartbeat',
  MEDIA_STATE: 'call:media-state',
  SERVER_DRAINING: 'server:draining',
  DIAGNOSTIC: 'call:diagnostic'
} as const;
