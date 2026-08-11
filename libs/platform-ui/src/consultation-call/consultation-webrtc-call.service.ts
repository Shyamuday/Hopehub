import { Injectable, signal } from '@angular/core';
import {
  CALL_SOCKET_EVENTS,
  type CallMode,
  type CallSignalingSocket,
  type CallState,
  type IceServerConfig,
  type MediaAccessResult,
  type PendingOffer
} from './webrtc-call.types';

const DEFAULT_STUN: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const CALL_ANSWER_TIMEOUT_MS = 45_000;
const MEDIA_CONNECT_TIMEOUT_MS = 25_000;
const RECONNECT_GRACE_MS = 20_000;

function sdpHasVideo(sdp: string): boolean {
  return /m=video /i.test(sdp);
}

function normalizeIceServers(iceServers: IceServerConfig[]) {
  return [...iceServers].sort((a, b) => {
    const aUrls = Array.isArray(a.urls) ? a.urls : [a.urls];
    const bUrls = Array.isArray(b.urls) ? b.urls : [b.urls];
    const aIsTurn = aUrls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    const bIsTurn = bUrls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    return Number(aIsTurn) - Number(bIsTurn);
  });
}

@Injectable({ providedIn: 'root' })
export class ConsultationWebrtcCallService {
  readonly state = signal<CallState>('idle');
  readonly error = signal('');
  readonly callMode = signal<CallMode>('audio');
  readonly localStream = signal<MediaStream | null>(null);
  readonly remoteStream = signal<MediaStream | null>(null);
  readonly incomingCall = signal(false);
  readonly pendingOffer = signal<PendingOffer | null>(null);

  private pc: RTCPeerConnection | null = null;
  private socket: CallSignalingSocket | null = null;
  private callContext: { consultationId: string; targetUserId: string } | null = null;
  private boundSocketId: symbol | null = null;
  private ensureMediaAccess: ((mode: CallMode) => Promise<MediaAccessResult>) | null = null;
  private iceQueue: RTCIceCandidateInit[] = [];
  private answerTimeout: ReturnType<typeof setTimeout> | null = null;
  private mediaTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  bindSocket(socket: CallSignalingSocket) {
    if (this.socket === socket && this.boundSocketId) return;

    this.unbindSocketListeners();
    this.socket = socket;
    this.boundSocketId = Symbol('call-socket');

    socket.on(CALL_SOCKET_EVENTS.RING, (raw: unknown) => {
      const payload = raw as { fromUserId?: string; consultationId?: string };
      if (!payload?.fromUserId) return;
      this.incomingCall.set(true);
      if (this.state() === 'idle') this.state.set('ringing');
    });

    socket.on(CALL_SOCKET_EVENTS.OFFER, (raw: unknown) => {
      void this.onRemoteOffer(raw);
    });

    socket.on(CALL_SOCKET_EVENTS.ANSWER, (raw: unknown) => {
      void this.onRemoteAnswer(raw);
    });

    socket.on(CALL_SOCKET_EVENTS.ICE, (raw: unknown) => {
      void this.onRemoteIce(raw);
    });

    socket.on(CALL_SOCKET_EVENTS.END, () => this.cleanup('ended'));
    socket.on(CALL_SOCKET_EVENTS.REJECT, () => this.cleanup('ended'));
  }

  setMediaAccessHandler(handler: (mode: CallMode) => Promise<MediaAccessResult>) {
    this.ensureMediaAccess = handler;
  }

  async startCall(params: {
    socket: CallSignalingSocket;
    consultationId: string;
    targetUserId: string;
    mode: CallMode;
    iceServers?: IceServerConfig[];
  }) {
    this.bindSocket(params.socket);
    this.callContext = { consultationId: params.consultationId, targetUserId: params.targetUserId };
    this.incomingCall.set(false);
    this.callMode.set(params.mode);
    this.error.set('');

    await this.ensurePeer(params.mode, params.iceServers ?? DEFAULT_STUN);
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);

    this.state.set('ringing');
    params.socket.emit(CALL_SOCKET_EVENTS.RING, {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId,
      mode: params.mode,
      metadata: this.callMetadata()
    });
    params.socket.emit(CALL_SOCKET_EVENTS.OFFER, {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId,
      mode: params.mode,
      sdp: offer,
      metadata: this.callMetadata()
    });
    this.startAnswerTimeout();
  }

  async acceptIncoming(iceServers: IceServerConfig[] = DEFAULT_STUN) {
    const offer = this.pendingOffer();
    if (!offer || !this.socket) return;

    this.callContext = {
      consultationId: offer.consultationId,
      targetUserId: offer.fromUserId
    };
    this.callMode.set(offer.mode);
    this.error.set('');
    this.incomingCall.set(false);

    try {
      await this.ensurePeer(offer.mode, iceServers);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      await this.flushIceQueue();
      this.socket.emit(CALL_SOCKET_EVENTS.ANSWER, {
        consultationId: offer.consultationId,
        targetUserId: offer.fromUserId,
        sdp: answer
      });
      this.pendingOffer.set(null);
      this.startMediaTimeout();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not join call.');
      this.state.set('error');
    }
  }

  rejectCall(params: { consultationId: string; targetUserId: string; reason?: string }) {
    this.socket?.emit(CALL_SOCKET_EVENTS.REJECT, {
      ...params,
      reason: params.reason || 'rejected',
      metadata: this.callMetadata()
    });
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.cleanup('ended');
  }

  endCall(params: { consultationId: string; targetUserId: string; reason?: string }) {
    this.socket?.emit(CALL_SOCKET_EVENTS.END, {
      ...params,
      reason: params.reason || 'ended_by_user',
      metadata: this.callMetadata()
    });
    this.cleanup('ended');
  }

  setMicEnabled(enabled: boolean) {
    this.localStream()
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream()
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  cleanup(state: CallState = 'idle') {
    this.clearCallTimers();
    this.localStream()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.localStream.set(null);
    this.remoteStream.set(null);
    this.pc?.close();
    this.pc = null;
    this.callContext = null;
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.iceQueue = [];
    this.state.set(state);
    this.error.set('');
  }

  private async onRemoteOffer(raw: unknown) {
    const payload = raw as {
      fromUserId?: string;
      consultationId?: string;
      mode?: CallMode;
      sdp?: RTCSessionDescriptionInit;
    };
    if (!payload?.fromUserId || !payload.consultationId || !payload.sdp?.sdp) return;

    const mode: CallMode =
      payload.mode === 'video' ? 'video' : sdpHasVideo(payload.sdp.sdp) ? 'video' : 'audio';
    this.callMode.set(mode);
    this.pendingOffer.set({
      fromUserId: payload.fromUserId,
      consultationId: payload.consultationId,
      sdp: payload.sdp,
      mode
    });
    this.incomingCall.set(true);
    this.state.set('ringing');
  }

  private async onRemoteAnswer(raw: unknown) {
    const payload = raw as { sdp?: RTCSessionDescriptionInit };
    if (!payload?.sdp || !this.pc) return;
    this.clearAnswerTimeout();
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    await this.flushIceQueue();
    this.startMediaTimeout();
  }

  private async onRemoteIce(raw: unknown) {
    const payload = raw as { candidate?: RTCIceCandidateInit };
    if (!payload?.candidate) return;
    if (!this.pc?.remoteDescription) {
      this.iceQueue.push(payload.candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      // stale candidate after reconnect — safe to ignore
    }
  }

  private async flushIceQueue() {
    if (!this.pc) return;
    const queued = [...this.iceQueue];
    this.iceQueue = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    }
  }

  private async ensurePeer(mode: CallMode, iceServers: IceServerConfig[] = DEFAULT_STUN) {
    if (this.pc) return;

    const access = this.ensureMediaAccess
      ? await this.ensureMediaAccess(mode)
      : await this.defaultMediaAccess(mode);
    if (!access.granted) {
      this.error.set(access.message ?? 'Camera or microphone permission required.');
      this.state.set('error');
      throw new Error(access.message ?? 'Media permission denied');
    }

    this.pc = new RTCPeerConnection({
      iceServers: normalizeIceServers(iceServers),
      iceTransportPolicy: 'all'
    });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video'
      });
    } catch {
      const message =
        mode === 'video'
          ? 'Camera and microphone access are required for video calls.'
          : 'Microphone access is required for voice calls.';
      this.error.set(message);
      this.state.set('error');
      throw new Error(message);
    }
    this.localStream.set(stream);

    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }

    this.pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (remote) this.remoteStream.set(remote);
    };

    this.pc.onicecandidate = (event) => {
      if (!event.candidate || !this.socket || !this.callContext) return;
      this.socket.emit(CALL_SOCKET_EVENTS.ICE, {
        consultationId: this.callContext.consultationId,
        targetUserId: this.callContext.targetUserId,
        candidate: event.candidate.toJSON()
      });
    };

    this.pc.onconnectionstatechange = () => this.handlePeerConnectionState();
    this.pc.oniceconnectionstatechange = () => this.handlePeerConnectionState();

    this.state.set('connecting');
  }

  private handlePeerConnectionState() {
    const pc = this.pc;
    if (!pc) return;

    const connectionState = pc.connectionState;
    const iceState = pc.iceConnectionState;
    if (connectionState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      this.clearMediaTimeout();
      this.clearReconnectTimeout();
      this.state.set('connected');
      return;
    }

    if (connectionState === 'failed' || iceState === 'failed') {
      this.failCall(
        'connection_failed',
        'Call connection failed. Please try again or continue in chat.'
      );
      return;
    }

    if (connectionState === 'disconnected' || iceState === 'disconnected') {
      if (this.state() === 'connected') this.state.set('reconnecting');
      this.startReconnectTimeout();
    }
  }

  private startAnswerTimeout() {
    this.clearAnswerTimeout();
    this.answerTimeout = setTimeout(() => {
      if (this.state() !== 'ringing') return;
      this.failCall('no_answer', 'No answer yet. Please try again or send a message.');
    }, CALL_ANSWER_TIMEOUT_MS);
  }

  private startMediaTimeout() {
    this.clearMediaTimeout();
    this.mediaTimeout = setTimeout(() => {
      if (this.state() === 'connected' || this.state() === 'ended') return;
      this.failCall(
        'media_timeout',
        'Call could not connect. Please try again or continue in chat.'
      );
    }, MEDIA_CONNECT_TIMEOUT_MS);
  }

  private startReconnectTimeout() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      if (this.state() !== 'reconnecting') return;
      this.failCall(
        'reconnect_timeout',
        'Call disconnected. Please try again or continue in chat.'
      );
    }, RECONNECT_GRACE_MS);
  }

  private failCall(reason: string, message: string) {
    const context = this.callContext;
    if (context) {
      this.socket?.emit(CALL_SOCKET_EVENTS.END, {
        ...context,
        reason,
        metadata: this.callMetadata()
      });
    }
    this.cleanup('ended');
    this.error.set(message);
  }

  private clearAnswerTimeout() {
    if (!this.answerTimeout) return;
    clearTimeout(this.answerTimeout);
    this.answerTimeout = null;
  }

  private clearMediaTimeout() {
    if (!this.mediaTimeout) return;
    clearTimeout(this.mediaTimeout);
    this.mediaTimeout = null;
  }

  private clearReconnectTimeout() {
    if (!this.reconnectTimeout) return;
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private clearCallTimers() {
    this.clearAnswerTimeout();
    this.clearMediaTimeout();
    this.clearReconnectTimeout();
  }

  private callMetadata(): Record<string, unknown> {
    return {
      userAgent:
        typeof navigator !== 'undefined' && 'userAgent' in navigator
          ? navigator.userAgent
          : undefined,
      platform:
        typeof navigator !== 'undefined' && 'platform' in navigator
          ? navigator.platform
          : undefined,
      connectionState: this.pc?.connectionState,
      iceConnectionState: this.pc?.iceConnectionState,
      mode: this.callMode()
    };
  }

  private async defaultMediaAccess(mode: CallMode): Promise<MediaAccessResult> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, message: 'Calls are not supported on this device.' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video'
      });
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch {
      return {
        granted: false,
        message:
          mode === 'video'
            ? 'Camera and microphone access are required for video calls.'
            : 'Microphone access is required for voice calls.'
      };
    }
  }

  private unbindSocketListeners() {
    if (!this.socket?.off) return;
    for (const event of Object.values(CALL_SOCKET_EVENTS)) {
      this.socket.off(event);
    }
  }
}
