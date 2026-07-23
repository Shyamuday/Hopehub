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
  signal
} from '@angular/core';
import { ConsultationWebrtcCallService } from './consultation-webrtc-call.service';
import type {
  CallMode,
  CallSignalingSocket,
  IceServerConfig,
  MediaAccessResult
} from './webrtc-call.types';

@Component({
  selector: 'hopehub-consultation-call-panel',
  standalone: true,
  templateUrl: './consultation-call-panel.component.html',
  styleUrl: './consultation-call-panel.component.scss'
})
export class ConsultationCallPanelComponent implements OnChanges, OnDestroy {
  readonly call = inject(ConsultationWebrtcCallService);

  @Input() consultationId = '';
  @Input() targetUserId = '';
  @Input() socket: CallSignalingSocket | null = null;
  @Input() iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  @Input() enabled = true;
  @Input() ensureMediaAccess?: (mode: CallMode) => Promise<MediaAccessResult>;

  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteAudio') remoteAudioRef?: ElementRef<HTMLAudioElement>;

  readonly busy = signal(false);
  readonly micOn = signal(true);
  readonly cameraOn = signal(true);

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
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['socket']?.currentValue) {
      this.call.bindSocket(changes['socket'].currentValue as CallSignalingSocket);
    }
    if (changes['ensureMediaAccess']?.currentValue) {
      this.call.setMediaAccessHandler(changes['ensureMediaAccess'].currentValue);
    }
  }

  ngOnDestroy() {
    this.call.cleanup();
  }

  canCall() {
    return this.enabled && !!this.consultationId && !!this.targetUserId && !!this.socket;
  }

  isVideoActive() {
    return (
      this.call.callMode() === 'video' &&
      (this.call.state() === 'connected' || this.call.state() === 'connecting')
    );
  }

  statusLabel() {
    const map: Record<string, string> = {
      idle: 'Voice & video consultation available',
      ringing: this.call.incomingCall() ? 'Incoming call…' : 'Calling…',
      connecting: 'Connecting…',
      connected: this.call.callMode() === 'video' ? 'On video call' : 'On voice call',
      ended: 'Call ended',
      error: 'Call error'
    };
    return map[this.call.state()] ?? '';
  }

  async start(mode: CallMode) {
    if (!this.socket || !this.consultationId || !this.targetUserId) return;
    this.busy.set(true);
    try {
      await this.call.startCall({
        socket: this.socket,
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        mode,
        iceServers: this.iceServers
      });
    } catch {
      // service sets error state
    } finally {
      this.busy.set(false);
    }
  }

  accept() {
    void this.call.acceptIncoming(this.iceServers);
  }

  reject() {
    const targetUserId = this.call.pendingOffer()?.fromUserId ?? this.targetUserId;
    if (!this.consultationId || !targetUserId) return;
    this.call.rejectCall({ consultationId: this.consultationId, targetUserId });
  }

  hangUp() {
    if (!this.consultationId || !this.targetUserId) return;
    this.call.endCall({ consultationId: this.consultationId, targetUserId: this.targetUserId });
  }

  toggleMic() {
    const next = !this.micOn();
    this.micOn.set(next);
    this.call.setMicEnabled(next);
  }

  toggleCamera() {
    const next = !this.cameraOn();
    this.cameraOn.set(next);
    this.call.setCameraEnabled(next);
  }
}
