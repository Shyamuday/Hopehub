import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ConsultationWebrtcCallService } from './consultation-webrtc-call.service';
import type { CallMode, CallSignalingSocket, IceServerConfig } from './webrtc-call.types';

@Component({
  selector: 'app-consultation-call-panel',
  standalone: true,
  templateUrl: './consultation-call-panel.component.html',
  styleUrl: './consultation-call-panel.component.scss',
})
export class ConsultationCallPanelComponent implements OnChanges, OnDestroy {
  readonly call = inject(ConsultationWebrtcCallService);

  @Input() consultationId = '';
  @Input() targetUserId = '';
  @Input() socket: CallSignalingSocket | null = null;
  @Input() iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  @Input() enabled = true;

  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteAudio') remoteAudioRef?: ElementRef<HTMLAudioElement>;

  readonly busy = signal(false);
  readonly micOn = signal(true);
  readonly cameraOn = signal(true);
  readonly callSeconds = signal(0);

  private callTimer: ReturnType<typeof setInterval> | null = null;
  private ringTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    effect(() => {
      const local = this.call.localStream();
      const el = this.localVideoRef?.nativeElement;
      if (el) el.srcObject = local;
    });
    effect(() => {
      const remote = this.call.remoteStream();
      const el = this.remoteVideoRef?.nativeElement;
      if (el) el.srcObject = remote;
    });
    effect(() => {
      const remote = this.call.remoteStream();
      const el = this.remoteAudioRef?.nativeElement;
      if (el) el.srcObject = remote;
    });
    effect(() => {
      const state = this.call.state();
      const incoming = this.call.incomingCall();

      if (state === 'connected') {
        this.startCallTimer();
      } else {
        this.stopCallTimer(state === 'ended' ? this.callSeconds() : 0);
      }

      if (state === 'ringing' && incoming) {
        this.startRingtone();
      } else {
        this.stopRingtone();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socket']?.currentValue) {
      this.call.bindSocket(changes['socket'].currentValue as CallSignalingSocket);
    }
  }

  ngOnDestroy(): void {
    this.stopRingtone();
    this.stopCallTimer(0);
    this.call.cleanup();
  }

  canCall(): boolean {
    return this.enabled && !!this.consultationId && !!this.targetUserId && !!this.socket;
  }

  isVideoActive(): boolean {
    return (
      this.call.callMode() === 'video' &&
      (this.call.state() === 'connected' || this.call.state() === 'connecting')
    );
  }

  statusLabel(): string {
    const map: Record<string, string> = {
      idle: 'Voice & video consultation available',
      ringing: this.call.incomingCall() ? 'Incoming call...' : 'Calling...',
      connecting: 'Connecting...',
      connected: this.call.callMode() === 'video' ? 'On video call' : 'On voice call',
      ended: 'Call ended',
      error: 'Call error',
    };
    return map[this.call.state()] ?? '';
  }

  callDuration(): string {
    const total = this.callSeconds();
    const minutes = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  async start(mode: CallMode): Promise<void> {
    if (!this.socket || !this.consultationId || !this.targetUserId) return;
    this.busy.set(true);
    try {
      await this.call.startCall({
        socket: this.socket,
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        mode,
        iceServers: this.iceServers,
      });
    } catch {
      // The service sets the visible error state.
    } finally {
      this.busy.set(false);
    }
  }

  accept(): void {
    this.stopRingtone();
    void this.call.acceptIncoming(this.iceServers);
  }

  reject(): void {
    this.stopRingtone();
    const targetUserId = this.call.pendingOffer()?.fromUserId ?? this.targetUserId;
    if (!this.consultationId || !targetUserId) return;
    this.call.rejectCall({ consultationId: this.consultationId, targetUserId });
  }

  hangUp(): void {
    this.stopRingtone();
    if (!this.consultationId || !this.targetUserId) return;
    this.call.endCall({ consultationId: this.consultationId, targetUserId: this.targetUserId });
  }

  toggleMic(): void {
    const next = !this.micOn();
    this.micOn.set(next);
    this.call.setMicEnabled(next);
  }

  toggleCamera(): void {
    const next = !this.cameraOn();
    this.cameraOn.set(next);
    this.call.setCameraEnabled(next);
  }

  private startCallTimer(): void {
    if (this.callTimer) return;
    this.callTimer = setInterval(() => {
      this.callSeconds.update((seconds) => seconds + 1);
    }, 1000);
  }

  private stopCallTimer(nextValue: number): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.callSeconds.set(nextValue);
  }

  private startRingtone(): void {
    if (this.ringTimer || typeof window === 'undefined') return;
    this.playRingTone();
    this.ringTimer = setInterval(() => this.playRingTone(), 2200);
  }

  private stopRingtone(): void {
    if (this.ringTimer) {
      clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
  }

  private playRingTone(): void {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      this.audioContext ??= new AudioContextCtor();

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Some browsers block audio before user interaction; visual incoming UI still works.
    }
  }
}
