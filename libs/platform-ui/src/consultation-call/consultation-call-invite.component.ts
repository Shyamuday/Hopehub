import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { ConsultationWebrtcCallService } from './consultation-webrtc-call.service';
import type { CallMode, IceServerConfig } from './webrtc-call.types';

@Component({
  selector: 'hopehub-consultation-call-invite',
  standalone: true,
  templateUrl: './consultation-call-invite.component.html',
  styleUrl: './consultation-call-invite.component.scss'
})
export class ConsultationCallInviteComponent implements OnDestroy {
  readonly call = inject(ConsultationWebrtcCallService);

  @Input() iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  @Output() opened = new EventEmitter<string>();

  readonly busy = signal(false);
  readonly minimized = signal(false);
  readonly elapsedSeconds = signal(0);
  readonly settingsOpen = signal(false);
  readonly settingsMessage = signal('');

  private remoteAudioElement: HTMLAudioElement | null = null;
  private remoteVideoElement: HTMLVideoElement | null = null;
  private localVideoElement: HTMLVideoElement | null = null;
  private connectedAt = 0;
  private durationTimer: ReturnType<typeof setInterval> | null = null;

  @ViewChild('remoteAudio')
  set remoteAudioRef(ref: ElementRef<HTMLAudioElement> | undefined) {
    this.remoteAudioElement = ref?.nativeElement ?? null;
    this.attachStreams();
  }

  @ViewChild('remoteVideo')
  set remoteVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.remoteVideoElement = ref?.nativeElement ?? null;
    this.attachStreams();
  }

  @ViewChild('localVideo')
  set localVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.localVideoElement = ref?.nativeElement ?? null;
    this.attachStreams();
  }

  constructor() {
    effect(() => {
      const state = this.call.state();
      this.call.localStream();
      this.call.remoteStream();
      this.attachStreams();
      if (state === 'ringing' && this.call.incomingCall()) {
        this.minimized.set(false);
        this.settingsOpen.set(false);
      }
      if (state === 'connected') this.startDuration();
      else if (state === 'ended' || state === 'idle') this.stopDuration(true);
    });
  }

  ngOnDestroy() {
    this.stopDuration(false);
  }

  visible() {
    return (
      this.call.hasActiveCall() ||
      Boolean(this.call.pendingOffer()) ||
      Boolean(this.call.lastCallSummary()) ||
      Boolean(this.call.recoverableCall())
    );
  }

  statusLabel() {
    if (this.call.recoverableCall() && !this.call.hasActiveCall()) return 'Call interrupted';
    const summary = this.call.lastCallSummary();
    if (summary && !this.call.hasActiveCall()) return summary.title;
    const state = this.call.state();
    if (state === 'ringing') {
      if (this.call.incomingCall()) return 'Incoming call';
      if (this.call.receiverUnavailable()) return 'Receiver unavailable';
      return this.call.remoteRinging() ? 'Ringing' : 'Calling';
    }
    if (state === 'connecting') return 'Connecting';
    if (state === 'reconnecting') return 'Reconnecting';
    if (state === 'connected') return 'Connected';
    if (state === 'error' && this.call.pendingOffer()) return 'Could not join';
    return 'Private call';
  }

  modeLabel() {
    return this.call.callMode() === 'video' ? 'Video call' : 'Voice call';
  }

  participantInitial() {
    return (this.call.participant().name.trim().charAt(0) || 'H').toUpperCase();
  }

  participantRoleLabel() {
    const role = this.call.participant().role?.toUpperCase();
    if (role === 'DOCTOR') return 'Hope Hub expert';
    if (role === 'PATIENT') return 'Hope Hub member';
    return 'Private participant';
  }

  durationLabel() {
    const total = this.elapsedSeconds();
    const minutes = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  networkLabel() {
    const quality = this.call.networkQuality();
    if (quality === 'good') return 'Good connection';
    if (quality === 'unstable') return 'Unstable connection';
    if (quality === 'poor') return 'Poor connection';
    return 'Checking connection';
  }

  async accept() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.call.acceptIncoming(this.iceServers);
    } finally {
      this.busy.set(false);
    }
  }

  decline() {
    const offer = this.call.pendingOffer();
    const consultationId = offer?.consultationId || this.call.activeConsultationId();
    const targetUserId = offer?.fromUserId || this.call.activeTargetUserId();
    if (!consultationId || !targetUserId) return;
    this.call.rejectCall({ consultationId, targetUserId });
  }

  async endCall() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.call.endCurrentCall();
    } finally {
      this.busy.set(false);
    }
  }

  toggleMic() {
    this.call.setMicEnabled(!this.call.micEnabled());
  }

  toggleCamera() {
    this.call.setCameraEnabled(!this.call.cameraEnabled());
  }

  async openSettings() {
    await this.call.refreshMediaDevices();
    this.settingsOpen.set(true);
  }

  async changeAudioInput(event: Event) {
    await this.call.selectAudioInput((event.target as HTMLSelectElement).value);
  }

  async changeVideoInput(event: Event) {
    await this.call.selectVideoInput((event.target as HTMLSelectElement).value);
  }

  async changeAudioOutput(event: Event) {
    this.call.selectAudioOutput((event.target as HTMLSelectElement).value);
    await this.applyAudioOutput(this.remoteAudioElement);
    await this.applyAudioOutput(this.remoteVideoElement);
  }

  async testSpeaker() {
    const played = await this.call.testSpeaker();
    this.settingsMessage.set(
      played ? 'Test sound played.' : 'Allow sound in your browser settings, then try again.'
    );
  }

  deviceLabel(device: MediaDeviceInfo, index: number, fallback: string) {
    return device.label || `${fallback} ${index + 1}`;
  }

  async switchMode(mode: CallMode) {
    if (this.busy() || this.call.callMode() === mode) return;
    this.busy.set(true);
    try {
      await this.call.switchCurrentCallMode(mode, this.iceServers);
    } finally {
      this.busy.set(false);
    }
  }

  async resumeCall() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.call.resumeRecoverableCall(this.iceServers);
    } finally {
      this.busy.set(false);
    }
  }

  openSession() {
    const consultationId =
      this.call.activeConsultationId() || this.call.pendingOffer()?.consultationId || '';
    const recoveryId = this.call.recoverableCall()?.consultationId || '';
    if (consultationId || recoveryId) this.opened.emit(consultationId || recoveryId);
  }

  private attachStreams() {
    const remote = this.call.remoteStream();
    const local = this.call.localStream();
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = remote;
      void this.applyAudioOutput(this.remoteAudioElement);
      if (remote) void this.remoteAudioElement.play().catch(() => undefined);
    }
    if (this.remoteVideoElement) {
      this.remoteVideoElement.srcObject = remote;
      void this.applyAudioOutput(this.remoteVideoElement);
      if (remote) void this.remoteVideoElement.play().catch(() => undefined);
    }
    if (this.localVideoElement) {
      this.localVideoElement.srcObject = local;
      if (local) void this.localVideoElement.play().catch(() => undefined);
    }
  }

  private async applyAudioOutput(element: HTMLMediaElement | null) {
    const deviceId = this.call.selectedAudioOutputId();
    const output = element as
      | (HTMLMediaElement & {
          setSinkId?: (sinkId: string) => Promise<void>;
        })
      | null;
    if (!output || !deviceId || !output.setSinkId) return;
    await output.setSinkId(deviceId).catch(() => undefined);
  }

  private startDuration() {
    if (this.durationTimer) return;
    if (!this.connectedAt) {
      this.connectedAt = Date.now();
      this.elapsedSeconds.set(0);
    }
    this.durationTimer = setInterval(
      () => this.elapsedSeconds.set(Math.floor((Date.now() - this.connectedAt) / 1000)),
      1_000
    );
  }

  private stopDuration(reset: boolean) {
    if (this.durationTimer) clearInterval(this.durationTimer);
    this.durationTimer = null;
    if (reset) {
      this.connectedAt = 0;
      this.elapsedSeconds.set(0);
    }
  }
}
