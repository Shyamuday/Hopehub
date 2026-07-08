import { Injectable, inject, signal } from '@angular/core';
import type { Socket } from 'socket.io-client';
import { NativePermissionsService } from './native-permissions.service';

export type VoiceCallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'error';

type StunServer = { urls: string };

@Injectable({ providedIn: 'root' })
export class ConsultationVoiceCallService {
  private readonly permissions = inject(NativePermissionsService);
  readonly state = signal<VoiceCallState>('idle');
  readonly error = signal('');
  readonly remoteAudio = signal<HTMLAudioElement | null>(null);

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private remoteAudioEl: HTMLAudioElement | null = null;

  bindSocket(socket: Socket) {
    this.socket = socket;
    socket.on('call:offer', (payload: { fromUserId: string; consultationId: string; sdp: RTCSessionDescriptionInit }) => {
      void this.handleOffer(payload);
    });
    socket.on('call:answer', (payload: { sdp: RTCSessionDescriptionInit }) => {
      void this.pc?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      this.state.set('connected');
    });
    socket.on('call:ice-candidate', (payload: { candidate: RTCIceCandidateInit }) => {
      void this.pc?.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });
    socket.on('call:end', () => this.cleanup('ended'));
    socket.on('call:reject', () => this.cleanup('ended'));
  }

  async startCall(params: {
    socket: Socket;
    consultationId: string;
    targetUserId: string;
    stunServers: StunServer[];
  }) {
    this.bindSocket(params.socket);
    await this.ensurePeer(params.stunServers);
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.state.set('ringing');
    params.socket.emit('call:ring', {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId
    });
    params.socket.emit('call:offer', {
      consultationId: params.consultationId,
      targetUserId: params.targetUserId,
      sdp: offer
    });
  }

  private async handleOffer(payload: {
    fromUserId: string;
    consultationId: string;
    sdp: RTCSessionDescriptionInit;
  }) {
    if (!this.socket) return;
    this.state.set('ringing');
    await this.ensurePeer([{ urls: 'stun:stun.l.google.com:19302' }]);
    await this.pc!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    this.socket.emit('call:answer', {
      consultationId: payload.consultationId,
      targetUserId: payload.fromUserId,
      sdp: answer
    });
    this.state.set('connected');
  }

  acceptIncoming() {
    this.state.set('connected');
  }

  rejectCall(params: { consultationId: string; targetUserId: string }) {
    this.socket?.emit('call:reject', params);
    this.cleanup('ended');
  }

  endCall(params: { consultationId: string; targetUserId: string }) {
    this.socket?.emit('call:end', params);
    this.cleanup('ended');
  }

  private async ensurePeer(stunServers: StunServer[]) {
    if (this.pc) return;

    const mic = await this.permissions.ensureVoiceCallPermissions();
    if (!mic.granted) {
      this.error.set(mic.message ?? 'Microphone permission required.');
      this.state.set('error');
      throw new Error(mic.message ?? 'Microphone permission denied');
    }

    this.pc = new RTCPeerConnection({ iceServers: stunServers });
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    for (const track of this.localStream.getTracks()) {
      this.pc.addTrack(track, this.localStream);
    }
    this.pc.ontrack = (event) => {
      const audio = this.remoteAudioEl ?? new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      this.remoteAudioEl = audio;
      this.remoteAudio.set(audio);
    };
    this.pc.onicecandidate = (event) => {
      if (!event.candidate || !this.socket) return;
      // targetUserId filled by component via last call context - skip if unknown
    };
    this.state.set('connecting');
  }

  cleanup(state: VoiceCallState = 'idle') {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null;
      this.remoteAudioEl = null;
    }
    this.remoteAudio.set(null);
    this.state.set(state);
  }
}
