import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { ConsultationWebrtcCallService } from './consultation-webrtc-call.service';
import type {
  BackgroundCallAlertReadiness,
  CallMode,
  CallSignalingSocket,
  IceServerConfig,
  MediaAccessResult
} from './webrtc-call.types';

function mediaAccessErrorMessageForCheck(error: unknown, mode: CallMode) {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Allow microphone and camera access from the browser address bar, then check again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return mode === 'video'
      ? 'A microphone or camera was not found. Connect the device, then check again.'
      : 'A microphone was not found. Connect it, then check again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'A device is busy in another app. Close the other call or recording app, then retry.';
  }
  return error instanceof Error && error.message
    ? error.message
    : 'Could not check your devices. Review browser permissions and retry.';
}

@Component({
  selector: 'hopehub-consultation-call-panel',
  standalone: true,
  templateUrl: './consultation-call-panel.component.html',
  styleUrl: './consultation-call-panel.component.scss'
})
export class ConsultationCallPanelComponent implements OnInit, OnChanges, OnDestroy {
  readonly call = inject(ConsultationWebrtcCallService);

  @Input() consultationId = '';
  @Input() targetUserId = '';
  @Input() socket: CallSignalingSocket | null = null;
  @Input() iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  @Input() enabled = true;
  @Input() allowAudio = true;
  @Input() allowVideo = true;
  @Input() allowPrivacyRelay = true;
  @Input() participantName = '';
  @Input() participantImageUrl = '';
  @Input() ensureMediaAccess?: (mode: CallMode) => Promise<MediaAccessResult>;
  @Input() enableBackgroundAlerts?: () => Promise<boolean>;
  @Input() getBackgroundAlertReadiness?: () => Promise<BackgroundCallAlertReadiness>;
  @Input() globalOverlayEnabled = true;

  private localVideoElement: HTMLVideoElement | null = null;
  private remoteVideoElement: HTMLVideoElement | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private preCallVideoElement: HTMLVideoElement | null = null;
  private preCallStream: MediaStream | null = null;

  @ViewChild('localVideo')
  set localVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.localVideoElement = ref?.nativeElement ?? null;
    this.attachLocalStream();
  }

  @ViewChild('remoteVideo')
  set remoteVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.remoteVideoElement = ref?.nativeElement ?? null;
    void this.attachRemoteStream(this.remoteVideoElement);
  }

  @ViewChild('remoteAudio')
  set remoteAudioRef(ref: ElementRef<HTMLAudioElement> | undefined) {
    this.remoteAudioElement = ref?.nativeElement ?? null;
    void this.attachRemoteStream(this.remoteAudioElement);
  }

  @ViewChild('preCallVideo')
  set preCallVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.preCallVideoElement = ref?.nativeElement ?? null;
    if (this.preCallVideoElement) this.preCallVideoElement.srcObject = this.preCallStream;
  }

  readonly busy = signal(false);
  readonly mediaCheckMessage = signal('');
  readonly mediaChecking = signal(false);
  readonly deviceChanging = signal(false);
  readonly audioPlaybackBlocked = signal(false);
  readonly callAlertMessage = signal('');
  readonly backgroundAlertReadiness = signal<BackgroundCallAlertReadiness | null>(null);
  readonly backgroundAlertChecking = signal(false);
  readonly settingsOpen = signal(false);
  readonly preCallOpen = signal(false);
  readonly preCallMode = signal<CallMode>('audio');
  readonly preCallChecking = signal(false);
  readonly preCallMicReady = signal(false);
  readonly preCallCameraReady = signal(false);
  readonly preCallSpeakerReady = signal(false);
  readonly preCallNetworkReady = signal(false);
  readonly preCallMessage = signal('');

  private readonly handleDeviceChange = () => void this.call.refreshMediaDevices();

  constructor() {
    effect(() => {
      this.call.localStream();
      this.attachLocalStream();
    });
    effect(() => {
      const remoteStream = this.call.remoteStream();
      this.call.selectedAudioOutputId();
      if (!remoteStream) this.audioPlaybackBlocked.set(false);
      void this.attachRemoteStream(this.remoteVideoElement);
      void this.attachRemoteStream(this.remoteAudioElement);
    });
  }

  ngOnInit() {
    void this.call.refreshMediaDevices();
    this.call.prewarmConnectivity(this.iceServers, this.requiresRelayForThisNetwork());
    if (typeof navigator !== 'undefined') {
      navigator.mediaDevices?.addEventListener?.('devicechange', this.handleDeviceChange);
    }
    void this.refreshBackgroundAlertReadiness();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['socket']?.currentValue) {
      this.call.bindSocket(changes['socket'].currentValue as CallSignalingSocket);
    }
    if (changes['ensureMediaAccess']?.currentValue) {
      this.call.setMediaAccessHandler(changes['ensureMediaAccess'].currentValue);
    }
    if (changes['iceServers']?.currentValue) {
      this.call.prewarmConnectivity(this.iceServers, this.requiresRelayForThisNetwork());
    }
  }

  ngOnDestroy() {
    this.stopPreCallStream();
    if (typeof navigator !== 'undefined') {
      navigator.mediaDevices?.removeEventListener?.('devicechange', this.handleDeviceChange);
    }
    if (
      !this.globalOverlayEnabled &&
      this.isThisCall() &&
      this.call.hasActiveCall() &&
      !(this.call.state() === 'ringing' && this.call.incomingCall()) &&
      this.consultationId &&
      this.targetUserId
    ) {
      void this.call.endCall({
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        reason: 'page_closed'
      });
    } else if (this.isThisCall() && this.call.state() === 'error') {
      this.call.cleanup();
    }
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

  isThisCall() {
    const activeConsultationId = this.call.activeConsultationId();
    if (activeConsultationId) return activeConsultationId === this.consultationId;
    const pendingConsultationId = this.call.pendingOffer()?.consultationId;
    return !pendingConsultationId || pendingConsultationId === this.consultationId;
  }

  anotherCallIsActive() {
    return this.call.hasActiveCall() && !this.isThisCall();
  }

  canStartCall() {
    return (
      this.isThisCall() &&
      !this.call.hasActiveCall() &&
      (this.call.state() === 'idle' || this.call.state() === 'ended')
    );
  }

  isVideoActive() {
    return (
      this.isThisCall() &&
      this.call.callMode() === 'video' &&
      (this.call.state() === 'connected' ||
        this.call.state() === 'connecting' ||
        this.call.state() === 'reconnecting')
    );
  }

  statusLabel() {
    if (this.anotherCallIsActive()) return 'Call already in progress';
    const idleLabel =
      this.allowAudio && this.allowVideo
        ? 'Voice & video consultation available'
        : this.allowVideo
          ? 'Video consultation available'
          : 'Voice consultation available';
    const map: Record<string, string> = {
      idle: idleLabel,
      ringing: this.call.incomingCall()
        ? 'Incoming call…'
        : this.call.remoteRinging()
          ? 'Ringing…'
          : 'Calling…',
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

  isMediaPermissionBlocked() {
    return /blocked|allow access|permission|secure https/i.test(this.call.error());
  }

  isMediaDeviceMissing() {
    return /could not find|no microphone|no camera|selected .* unavailable/i.test(
      this.call.error()
    );
  }

  isMediaDeviceBusy() {
    return /busy in another app/i.test(this.call.error());
  }

  retryActionLabel() {
    if (this.busy()) return 'Checking…';
    if (this.isMediaPermissionBlocked()) return 'Request access again';
    if (this.isMediaDeviceMissing()) return 'Check devices & retry';
    if (this.isMediaDeviceBusy()) return 'Retry device';
    return 'Retry call';
  }

  showDeviceSettings() {
    return (
      this.call.audioInputs().length > 0 ||
      this.call.videoInputs().length > 0 ||
      this.call.audioOutputs().length > 0
    );
  }

  canSelectAudioOutput() {
    return (
      typeof HTMLMediaElement !== 'undefined' &&
      'setSinkId' in HTMLMediaElement.prototype &&
      this.call.audioOutputs().length > 0
    );
  }

  networkQualityLabel() {
    const quality = this.call.networkQuality();
    if (quality === 'good') return 'Good network';
    if (quality === 'unstable') return 'Unstable network';
    if (quality === 'poor') return 'Poor network';
    return 'Checking network';
  }

  requiresRelayForThisNetwork() {
    return this.call.privacyRelay() || this.call.networkProfile().requiresRelay;
  }

  participantInitial() {
    return (this.participantName.trim().charAt(0) || 'H').toUpperCase();
  }

  openSettings() {
    this.settingsOpen.set(true);
    void this.refreshBackgroundAlertReadiness();
  }

  closeSettings() {
    this.settingsOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeSettingsWithEscape() {
    this.closeSettings();
  }

  async enableCallAlerts() {
    const enabled = await this.call.enableIncomingAlerts();
    const backgroundEnabled = this.enableBackgroundAlerts
      ? await this.enableBackgroundAlerts()
      : false;
    this.callAlertMessage.set(
      enabled || backgroundEnabled
        ? backgroundEnabled
          ? 'Incoming call sound and background alerts are on.'
          : 'Incoming call sound is on.'
        : 'Browser sound is blocked. Allow sound from the address-bar site settings.'
    );
    await this.refreshBackgroundAlertReadiness();
  }

  async refreshBackgroundAlertReadiness() {
    if (!this.getBackgroundAlertReadiness || this.backgroundAlertChecking()) return;
    this.backgroundAlertChecking.set(true);
    try {
      this.backgroundAlertReadiness.set(await this.getBackgroundAlertReadiness());
    } catch {
      this.backgroundAlertReadiness.set({
        supported: false,
        enabled: false,
        installed: false,
        native: false,
        permission: 'unsupported',
        canEnable: false,
        message: 'Background call alert status could not be checked on this device.'
      });
    } finally {
      this.backgroundAlertChecking.set(false);
    }
  }

  showEnableAlertsButton() {
    const readiness = this.backgroundAlertReadiness();
    return (
      !this.call.incomingAlertsEnabled() || Boolean(readiness?.canEnable && !readiness.enabled)
    );
  }

  deviceLabel(device: MediaDeviceInfo, index: number, kind: 'microphone' | 'camera' | 'speaker') {
    return (
      device.label ||
      `${kind === 'microphone' ? 'Microphone' : kind === 'camera' ? 'Camera' : 'Speaker'} ${index + 1}`
    );
  }

  async changeAudioInput(event: Event) {
    const deviceId = (event.target as HTMLSelectElement).value;
    this.deviceChanging.set(true);
    try {
      await this.call.selectAudioInput(deviceId);
    } catch {
      // The shared call service exposes the device error.
    } finally {
      this.deviceChanging.set(false);
    }
  }

  async changeVideoInput(event: Event) {
    const deviceId = (event.target as HTMLSelectElement).value;
    this.deviceChanging.set(true);
    try {
      await this.call.selectVideoInput(deviceId);
    } catch {
      // The shared call service exposes the device error.
    } finally {
      this.deviceChanging.set(false);
    }
  }

  async changeAudioOutput(event: Event) {
    const deviceId = (event.target as HTMLSelectElement).value;
    this.call.selectAudioOutput(deviceId);
    await this.applyAudioOutput(this.remoteAudioElement);
    await this.applyAudioOutput(this.remoteVideoElement);
  }

  async resumeRemoteAudio() {
    const element =
      this.call.callMode() === 'video' ? this.remoteVideoElement : this.remoteAudioElement;
    if (!element) return;
    try {
      await element.play();
      this.audioPlaybackBlocked.set(false);
    } catch {
      this.audioPlaybackBlocked.set(true);
    }
  }

  async testSpeaker() {
    const heard = await this.call.testSpeaker();
    this.mediaCheckMessage.set(
      heard
        ? 'Speaker test played. If you did not hear it, check browser and system volume.'
        : 'Browser sound is blocked. Allow sound in site settings and retry.'
    );
  }

  async start(mode: CallMode, preparedStream?: MediaStream) {
    if (
      (mode === 'audio' && !this.allowAudio) ||
      (mode === 'video' && !this.allowVideo) ||
      !this.socket ||
      !this.consultationId ||
      !this.targetUserId ||
      !this.canStartCall()
    ) {
      preparedStream?.getTracks().forEach((track) => track.stop());
      return;
    }
    this.call.setParticipant({
      name: this.participantName || 'Hope Hub member',
      imageUrl: this.participantImageUrl || undefined
    });
    this.busy.set(true);
    try {
      await this.call.startCall({
        socket: this.socket,
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        mode,
        iceServers: this.iceServers,
        privacyRelay: this.call.privacyRelay(),
        preparedStream
      });
    } catch {
      // service sets error state
    } finally {
      this.busy.set(false);
    }
  }

  async prepareCall(mode: CallMode) {
    if ((mode === 'audio' && !this.allowAudio) || (mode === 'video' && !this.allowVideo)) return;
    if (!this.canStartCall() || this.preCallChecking()) return;
    this.stopPreCallStream();
    this.preCallMode.set(mode);
    this.preCallOpen.set(true);
    this.preCallChecking.set(true);
    this.preCallMicReady.set(false);
    this.preCallCameraReady.set(mode === 'audio');
    this.preCallSpeakerReady.set(false);
    this.preCallNetworkReady.set(false);
    this.preCallMessage.set('Checking your devices and connection…');
    try {
      const connectivityPromise = this.call.testConnectivity(
        this.iceServers,
        this.requiresRelayForThisNetwork()
      );
      const speakerPromise = this.call.testSpeaker();
      const stream = await this.call.acquireMediaStream(mode);
      this.preCallStream = stream;
      if (this.preCallVideoElement) {
        this.preCallVideoElement.srcObject = stream;
        await this.preCallVideoElement.play().catch(() => undefined);
      }
      this.preCallMicReady.set(stream.getAudioTracks().length > 0);
      this.preCallCameraReady.set(mode === 'audio' || stream.getVideoTracks().length > 0);
      const [speakerReady, connectivity] = await Promise.all([speakerPromise, connectivityPromise]);
      this.preCallSpeakerReady.set(speakerReady);
      this.preCallNetworkReady.set(connectivity.ok);
      this.preCallMessage.set(
        connectivity.ok
          ? this.requiresRelayForThisNetwork()
            ? 'Your mobile-friendly call connection is ready.'
            : 'Everything needed for your call is ready.'
          : connectivity.message
      );
    } catch (error) {
      this.preCallMessage.set(mediaAccessErrorMessageForCheck(error, mode));
    } finally {
      this.preCallChecking.set(false);
    }
  }

  preCallReady() {
    return (
      this.preCallMicReady() &&
      this.preCallCameraReady() &&
      this.preCallSpeakerReady() &&
      this.preCallNetworkReady()
    );
  }

  async confirmPreparedCall() {
    if (!this.preCallReady() || this.preCallChecking()) return;
    const mode = this.preCallMode();
    const preparedStream = this.takePreCallStream();
    this.preCallOpen.set(false);
    await this.start(mode, preparedStream ?? undefined);
  }

  closePreCall() {
    this.stopPreCallStream();
    this.preCallOpen.set(false);
  }

  private stopPreCallStream() {
    this.preCallStream?.getTracks().forEach((track) => track.stop());
    this.preCallStream = null;
    if (this.preCallVideoElement) this.preCallVideoElement.srcObject = null;
  }

  private takePreCallStream(): MediaStream | null {
    const stream = this.preCallStream;
    this.preCallStream = null;
    if (this.preCallVideoElement) this.preCallVideoElement.srcObject = null;
    return stream;
  }

  async tryVoiceFallback() {
    this.call.cleanup('ended');
    await this.start('audio');
  }

  async retryCall() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (this.isMediaDeviceMissing()) {
        await this.call.resetMediaDeviceSelection();
      }
      if (this.call.pendingOffer()) {
        await this.call.acceptIncoming(this.iceServers);
        return;
      }

      const mode = this.call.callMode();
      this.call.cleanup('ended');
      if (!this.socket || !this.consultationId || !this.targetUserId) return;
      await this.call.startCall({
        socket: this.socket,
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        mode,
        iceServers: this.iceServers,
        privacyRelay: this.call.privacyRelay()
      });
    } catch {
      // The call service exposes the actionable error message.
    } finally {
      this.busy.set(false);
    }
  }

  async switchMode(mode: CallMode) {
    if (this.busy() || this.call.callMode() === mode) return;
    if ((mode === 'audio' && !this.allowAudio) || (mode === 'video' && !this.allowVideo)) return;
    if (!this.socket || !this.consultationId || !this.targetUserId) return;

    this.busy.set(true);
    try {
      await this.call.endCall({
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        reason: mode === 'video' ? 'switch_to_video' : 'switch_to_voice'
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
      await this.call.startCall({
        socket: this.socket,
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        mode,
        iceServers: this.iceServers,
        privacyRelay: this.call.privacyRelay()
      });
    } catch {
      // service exposes the actionable media/signalling error
    } finally {
      this.busy.set(false);
    }
  }

  async testMedia(mode: CallMode) {
    if (this.mediaChecking()) return;
    this.mediaChecking.set(true);
    this.mediaCheckMessage.set('');
    try {
      const result = this.ensureMediaAccess
        ? await this.ensureMediaAccess(mode)
        : await this.defaultMediaCheck(mode);
      if (result.granted) {
        const connectivity = await this.call.testConnectivity(
          this.iceServers,
          this.requiresRelayForThisNetwork()
        );
        this.mediaCheckMessage.set(
          connectivity.ok
            ? `${result.message || (mode === 'video' ? 'Camera and mic ready.' : 'Mic ready.')} ${connectivity.message}`
            : connectivity.message
        );
        return;
      }
      this.mediaCheckMessage.set(result.message || 'Media access is blocked.');
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
    const next = !this.call.micEnabled();
    this.call.setMicEnabled(next);
  }

  toggleCamera() {
    const next = !this.call.cameraEnabled();
    this.call.setCameraEnabled(next);
  }

  togglePrivacyRelay(event: Event) {
    this.call.setPrivacyRelay((event.target as HTMLInputElement).checked);
    this.mediaCheckMessage.set('');
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
      const audioDetected = await this.detectMicrophoneSignal(stream);
      stream.getTracks().forEach((track) => track.stop());
      return {
        granted: true,
        message: `${mode === 'video' ? 'Camera is ready. ' : ''}${
          audioDetected
            ? 'Microphone signal detected.'
            : 'Microphone is allowed, but no sound was detected.'
        }`
      };
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

  private async detectMicrophoneSignal(stream: MediaStream) {
    if (typeof AudioContext === 'undefined' || !stream.getAudioTracks().length) return false;
    const context = new AudioContext();
    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      const samples = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(samples);
      return samples.some((sample) => Math.abs(sample - 128) > 2);
    } catch {
      return false;
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  private attachLocalStream() {
    if (this.localVideoElement) {
      this.localVideoElement.srcObject = this.call.localStream();
    }
  }

  private async attachRemoteStream(element: HTMLMediaElement | null) {
    if (!element) return;
    const stream = this.call.remoteStream();
    element.srcObject = stream;
    await this.applyAudioOutput(element);
    if (!stream) return;
    try {
      await element.play();
      this.audioPlaybackBlocked.set(false);
    } catch {
      this.audioPlaybackBlocked.set(true);
    }
  }

  private async applyAudioOutput(element: HTMLMediaElement | null) {
    const deviceId = this.call.selectedAudioOutputId();
    if (!element || !deviceId) return;
    const outputElement = element as HTMLMediaElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };
    try {
      await outputElement.setSinkId?.(deviceId);
    } catch {
      // Output selection is not supported by every browser; default output remains active.
    }
  }
}
