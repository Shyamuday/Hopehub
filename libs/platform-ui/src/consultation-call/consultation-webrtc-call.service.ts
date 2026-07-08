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

function sdpHasVideo(sdp: string): boolean {
  return /m=video /i.test(sdp);
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
      targetUserId: params.targetUserId
    });
    params.socket.emit(CALL_SOCKET_EVENTS.OFFER, {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId,
      sdp: offer
    });
  }

  async acceptIncoming() {
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
      await this.ensurePeer(offer.mode);
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
      this.state.set('connected');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not join call.');
      this.state.set('error');
    }
  }

  rejectCall(params: { consultationId: string; targetUserId: string }) {
    this.socket?.emit(CALL_SOCKET_EVENTS.REJECT, params);
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.cleanup('ended');
  }

  endCall(params: { consultationId: string; targetUserId: string }) {
    this.socket?.emit(CALL_SOCKET_EVENTS.END, params);
    this.cleanup('ended');
  }

  setMicEnabled(enabled: boolean) {
    this.localStream()?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream()?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  cleanup(state: CallState = 'idle') {
    this.localStream()?.getTracks().forEach((track) => track.stop());
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
      sdp?: RTCSessionDescriptionInit;
    };
    if (!payload?.fromUserId || !payload.consultationId || !payload.sdp?.sdp) return;

    const mode: CallMode = sdpHasVideo(payload.sdp.sdp) ? 'video' : 'audio';
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
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    await this.flushIceQueue();
    this.state.set('connected');
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

    this.pc = new RTCPeerConnection({ iceServers });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video'
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
        candidate: event.candidate.toJSON()
      });
    };

    this.state.set('connecting');
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
