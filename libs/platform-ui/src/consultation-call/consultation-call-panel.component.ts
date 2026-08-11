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
  @Input() allowAudio = true;
  @Input() allowVideo = true;
  @Input() ensureMediaAccess?: (mode: CallMode) => Promise<MediaAccessResult>;

  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteAudio') remoteAudioRef?: ElementRef<HTMLAudioElement>;

  readonly busy = signal(false);
  readonly micOn = signal(true);
  readonly cameraOn = signal(true);
  readonly mediaCheckMessage = signal('');
  readonly mediaChecking = signal(false);

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
    return (
      this.enabled &&
      (this.allowAudio || this.allowVideo) &&
      !!this.consultationId &&
      !!this.targetUserId &&
      !!this.socket
    );
  }

  isVideoActive() {
    return (
      this.call.callMode() === 'video' &&
      (this.call.state() === 'connected' ||
        this.call.state() === 'connecting' ||
        this.call.state() === 'reconnecting')
    );
  }

  statusLabel() {
    const idleLabel =
      this.allowAudio && this.allowVideo
        ? 'Voice & video consultation available'
        : this.allowVideo
          ? 'Video consultation available'
          : 'Voice consultation available';
    const map: Record<string, string> = {
      idle: idleLabel,
      ringing: this.call.incomingCall() ? 'Incoming call…' : 'Calling…',
      connecting: 'Connecting…',
      connected: this.call.callMode() === 'video' ? 'On video call' : 'On voice call',
      reconnecting: 'Reconnecting…',
      ended: 'Call ended',
      error: 'Call error'
    };
    return map[this.call.state()] ?? '';
  }

  showVoiceFallback() {
    return this.allowAudio && this.call.callMode() === 'video' && Boolean(this.call.error());
  }

  async start(mode: CallMode) {
    if ((mode === 'audio' && !this.allowAudio) || (mode === 'video' && !this.allowVideo)) return;
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

  async tryVoiceFallback() {
    this.call.cleanup('ended');
    await this.start('audio');
  }

  async testMedia(mode: CallMode) {
    if (this.mediaChecking()) return;
    this.mediaChecking.set(true);
    this.mediaCheckMessage.set('');
    try {
      const result = this.ensureMediaAccess
        ? await this.ensureMediaAccess(mode)
        : await this.defaultMediaCheck(mode);
      this.mediaCheckMessage.set(
        result.granted
          ? mode === 'video'
            ? 'Camera and mic look ready.'
            : 'Mic looks ready.'
          : result.message || 'Media access is blocked.'
      );
    } finally {
      this.mediaChecking.set(false);
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

  async hangUp() {
    if (!this.consultationId || !this.targetUserId) return;
    await this.call.endCall({
      consultationId: this.consultationId,
      targetUserId: this.targetUserId
    });
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

  private async defaultMediaCheck(mode: CallMode): Promise<MediaAccessResult> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, message: 'Calls are not supported on this device/browser.' };
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
            ? 'Camera or mic is blocked. Allow access from browser settings, or try voice.'
            : 'Mic is blocked. Allow microphone access from browser settings.'
      };
    }
  }
}
