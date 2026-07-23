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
  private iceQueue: RTCIceCandidateInit[] = [];

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
    });
    params.socket.emit(CALL_SOCKET_EVENTS.OFFER, {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId,
      sdp: offer,
    });
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
      this.state.set('connected');
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
      sdp?: RTCSessionDescriptionInit;
    };
    if (!payload?.fromUserId || !payload.consultationId || !payload.sdp?.sdp) return;

    this.pendingOffer.set({
      fromUserId: payload.fromUserId,
      consultationId: payload.consultationId,
      sdp: payload.sdp,
      mode: sdpHasVideo(payload.sdp.sdp) ? 'video' : 'audio',
    });
    this.incomingCall.set(true);
    this.state.set('ringing');
  }

  private async onRemoteAnswer(raw: unknown): Promise<void> {
    const payload = raw as { sdp?: RTCSessionDescriptionInit };
    if (!payload?.sdp || !this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    await this.flushIceQueue();
    this.state.set('connected');
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

    this.pc = new RTCPeerConnection({ iceServers });
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

    this.state.set('connecting');
  }

  private unbindSocketListeners(): void {
    if (!this.socket?.off) return;
    for (const event of Object.values(CALL_SOCKET_EVENTS)) {
      this.socket.off(event);
    }
  }
}
