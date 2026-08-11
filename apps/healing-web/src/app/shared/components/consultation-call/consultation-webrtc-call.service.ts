import { Injectable, signal } from '@angular/core';
import {
  CALL_SOCKET_EVENTS,
  type CallMode,
  type CallSignalingSocket,
  type CallState,
  type IceServerConfig,
  type PendingOffer,
} from './webrtc-call.types';

const DEFAULT_STUN: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const CALL_ANSWER_TIMEOUT_MS = 45_000;
const MEDIA_CONNECT_TIMEOUT_MS = 25_000;
const RECONNECT_GRACE_MS = 20_000;

function sdpHasVideo(sdp: string): boolean {
  return /m=video /i.test(sdp);
}

function normalizeIceServers(iceServers: IceServerConfig[]): IceServerConfig[] {
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
  private iceQueue: RTCIceCandidateInit[] = [];
  private answerTimeout: ReturnType<typeof setTimeout> | null = null;
  private mediaTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  bindSocket(socket: CallSignalingSocket): void {
    if (this.socket === socket) return;

    this.unbindSocketListeners();
    this.socket = socket;

    socket.on(CALL_SOCKET_EVENTS.RING, (raw: unknown) => {
      const payload = raw as { fromUserId?: string };
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

  async startCall(params: {
    socket: CallSignalingSocket;
    consultationId: string;
    targetUserId: string;
    mode: CallMode;
    iceServers?: IceServerConfig[];
  }): Promise<void> {
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
    });
    params.socket.emit(CALL_SOCKET_EVENTS.OFFER, {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId,
      mode: params.mode,
      sdp: offer,
    });
    this.startAnswerTimeout();
  }

  async acceptIncoming(iceServers: IceServerConfig[] = DEFAULT_STUN): Promise<void> {
    const offer = this.pendingOffer();
    if (!offer || !this.socket) return;

    this.callContext = {
      consultationId: offer.consultationId,
      targetUserId: offer.fromUserId,
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
        sdp: answer,
      });
      this.pendingOffer.set(null);
      this.startMediaTimeout();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not join call.');
      this.state.set('error');
    }
  }

  rejectCall(params: { consultationId: string; targetUserId: string }): void {
    this.socket?.emit(CALL_SOCKET_EVENTS.REJECT, params);
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.cleanup('ended');
  }

  endCall(params: { consultationId: string; targetUserId: string }): void {
    this.socket?.emit(CALL_SOCKET_EVENTS.END, params);
    this.cleanup('ended');
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream()
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  setCameraEnabled(enabled: boolean): void {
    this.localStream()
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  cleanup(state: CallState = 'idle'): void {
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

  private async onRemoteOffer(raw: unknown): Promise<void> {
    const payload = raw as {
      fromUserId?: string;
      consultationId?: string;
      mode?: CallMode;
      sdp?: RTCSessionDescriptionInit;
    };
    if (!payload?.fromUserId || !payload.consultationId || !payload.sdp?.sdp) return;

    const mode =
      payload.mode === 'video' ? 'video' : sdpHasVideo(payload.sdp.sdp) ? 'video' : 'audio';
    this.callMode.set(mode);
    this.pendingOffer.set({
      fromUserId: payload.fromUserId,
      consultationId: payload.consultationId,
      sdp: payload.sdp,
      mode,
    });
    this.incomingCall.set(true);
    this.state.set('ringing');
  }

  private async onRemoteAnswer(raw: unknown): Promise<void> {
    const payload = raw as { sdp?: RTCSessionDescriptionInit };
    if (!payload?.sdp || !this.pc) return;
    this.clearAnswerTimeout();
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    await this.flushIceQueue();
    this.startMediaTimeout();
  }

  private async onRemoteIce(raw: unknown): Promise<void> {
    const payload = raw as { candidate?: RTCIceCandidateInit };
    if (!payload?.candidate) return;
    if (!this.pc?.remoteDescription) {
      this.iceQueue.push(payload.candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      // Ignore stale candidates after reconnects.
    }
  }

  private async flushIceQueue(): Promise<void> {
    if (!this.pc) return;
    const queued = [...this.iceQueue];
    this.iceQueue = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale candidates after reconnects.
      }
    }
  }

  private async ensurePeer(mode: CallMode, iceServers: IceServerConfig[]): Promise<void> {
    if (this.pc) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.error.set('Calls are not supported on this device.');
      this.state.set('error');
      throw new Error('Calls are not supported on this device.');
    }

    this.pc = new RTCPeerConnection({
      iceServers: normalizeIceServers(iceServers),
      iceTransportPolicy: 'all',
    });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video',
    });
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
        candidate: event.candidate.toJSON(),
      });
    };

    this.pc.onconnectionstatechange = () => this.handlePeerConnectionState();
    this.pc.oniceconnectionstatechange = () => this.handlePeerConnectionState();

    this.state.set('connecting');
  }

  private handlePeerConnectionState(): void {
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
      this.failCall('Call connection failed. Please try again or continue in chat.');
      return;
    }

    if (connectionState === 'disconnected' || iceState === 'disconnected') {
      if (this.state() === 'connected') this.state.set('reconnecting');
      this.startReconnectTimeout();
    }
  }

  private startAnswerTimeout(): void {
    this.clearAnswerTimeout();
    this.answerTimeout = setTimeout(() => {
      if (this.state() !== 'ringing') return;
      this.failCall('No answer yet. Please try again or send a message.');
    }, CALL_ANSWER_TIMEOUT_MS);
  }

  private startMediaTimeout(): void {
    this.clearMediaTimeout();
    this.mediaTimeout = setTimeout(() => {
      if (this.state() === 'connected' || this.state() === 'ended') return;
      this.failCall('Call could not connect. Please try again or continue in chat.');
    }, MEDIA_CONNECT_TIMEOUT_MS);
  }

  private startReconnectTimeout(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      if (this.state() !== 'reconnecting') return;
      this.failCall('Call disconnected. Please try again or continue in chat.');
    }, RECONNECT_GRACE_MS);
  }

  private failCall(message: string): void {
    const context = this.callContext;
    if (context) {
      this.socket?.emit(CALL_SOCKET_EVENTS.END, context);
    }
    this.cleanup('ended');
    this.error.set(message);
  }

  private clearAnswerTimeout(): void {
    if (!this.answerTimeout) return;
    clearTimeout(this.answerTimeout);
    this.answerTimeout = null;
  }

  private clearMediaTimeout(): void {
    if (!this.mediaTimeout) return;
    clearTimeout(this.mediaTimeout);
    this.mediaTimeout = null;
  }

  private clearReconnectTimeout(): void {
    if (!this.reconnectTimeout) return;
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private clearCallTimers(): void {
    this.clearAnswerTimeout();
    this.clearMediaTimeout();
    this.clearReconnectTimeout();
  }

  private unbindSocketListeners(): void {
    if (!this.socket?.off) return;
    for (const event of Object.values(CALL_SOCKET_EVENTS)) {
      this.socket.off(event);
    }
  }
}
