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
  readonly speakerPickerOpen = signal(false);
  readonly moreOpen = signal(false);
  readonly fullscreen = signal(false);
  readonly pictureInPicture = signal(false);
  readonly controlsHidden = signal(false);
  readonly previewOffset = signal({ x: 0, y: 0 });
  readonly surfaceSwipeY = signal(0);
  readonly actionMessage = signal('');
  readonly settingsMessage = signal('');

  private remoteAudioElement: HTMLAudioElement | null = null;
  private remoteVideoElement: HTMLVideoElement | null = null;
  private localVideoElement: HTMLVideoElement | null = null;
  private connectedAt = 0;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private controlsTimer: ReturnType<typeof setTimeout> | null = null;
  private actionMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSpeakerOutputId = '';
  private handledRestoreRequest = 0;
  private surfaceSwipe: { pointerId: number; startY: number } | null = null;
  private previewDrag: {
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null = null;
  private readonly handleFullscreenChange = () =>
    this.fullscreen.set(Boolean(document.fullscreenElement));
  private readonly handleEnterPictureInPicture = () => this.pictureInPicture.set(true);
  private readonly handleLeavePictureInPicture = () => this.pictureInPicture.set(false);

  @ViewChild('callSurface') private callSurfaceRef?: ElementRef<HTMLElement>;

  @ViewChild('remoteAudio')
  set remoteAudioRef(ref: ElementRef<HTMLAudioElement> | undefined) {
    this.remoteAudioElement = ref?.nativeElement ?? null;
    this.attachStreams();
  }

  @ViewChild('remoteVideo')
  set remoteVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.remoteVideoElement?.removeEventListener(
      'enterpictureinpicture',
      this.handleEnterPictureInPicture
    );
    this.remoteVideoElement?.removeEventListener(
      'leavepictureinpicture',
      this.handleLeavePictureInPicture
    );
    this.remoteVideoElement = ref?.nativeElement ?? null;
    this.remoteVideoElement?.addEventListener(
      'enterpictureinpicture',
      this.handleEnterPictureInPicture
    );
    this.remoteVideoElement?.addEventListener(
      'leavepictureinpicture',
      this.handleLeavePictureInPicture
    );
    this.attachStreams();
  }

  @ViewChild('localVideo')
  set localVideoRef(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.localVideoElement = ref?.nativeElement ?? null;
    this.attachStreams();
  }

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    }
    effect(() => {
      const state = this.call.state();
      this.call.localStream();
      this.call.remoteStream();
      this.call.selectedAudioOutputId();
      this.attachStreams();
      if (state === 'ringing' && this.call.incomingCall()) {
        this.minimized.set(false);
        this.settingsOpen.set(false);
        this.speakerPickerOpen.set(false);
        this.moreOpen.set(false);
      }
      if (state === 'connected') {
        this.startDuration();
        this.scheduleControlsHide();
      } else if (state === 'ended' || state === 'idle') {
        this.stopDuration(true);
        this.speakerPickerOpen.set(false);
        this.moreOpen.set(false);
        this.controlsHidden.set(false);
        this.previewOffset.set({ x: 0, y: 0 });
      }
    });
    effect(() => {
      const request = this.call.callUiRestoreRequest();
      if (!request || request === this.handledRestoreRequest) return;
      this.handledRestoreRequest = request;
      this.minimized.set(false);
      this.controlsHidden.set(false);
      this.showControls();
    });
  }

  ngOnDestroy() {
    this.stopDuration(false);
    this.clearControlsTimer();
    if (this.actionMessageTimer) clearTimeout(this.actionMessageTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    }
    this.remoteVideoElement?.removeEventListener(
      'enterpictureinpicture',
      this.handleEnterPictureInPicture
    );
    this.remoteVideoElement?.removeEventListener(
      'leavepictureinpicture',
      this.handleLeavePictureInPicture
    );
  }

  visible() {
    return (
      this.call.hasActiveCall() ||
      Boolean(this.call.activeCallElsewhere()) ||
      Boolean(this.call.pendingOffer()) ||
      Boolean(this.call.lastCallSummary()) ||
      Boolean(this.call.recoverableCall())
    );
  }

  statusLabel() {
    if (this.call.activeCallElsewhere() && !this.call.hasActiveCall()) return 'Call already active';
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

  isVerifiedExpert() {
    return this.call.participant().role?.toUpperCase() === 'DOCTOR';
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
    const enabled = !this.call.micEnabled();
    this.call.setMicEnabled(enabled);
    this.showActionFeedback(enabled ? 'Microphone on' : 'Microphone muted');
  }

  toggleCamera() {
    const enabled = !this.call.cameraEnabled();
    this.call.setCameraEnabled(enabled);
    this.showActionFeedback(enabled ? 'Camera on' : 'Camera off');
  }

  toggleMinimized() {
    this.minimized.update((value) => !value);
    this.surfaceSwipeY.set(0);
  }

  restoreCall() {
    this.minimized.set(false);
    this.controlsHidden.set(false);
    this.showControls();
  }

  async openSettings() {
    await this.call.refreshMediaDevices();
    this.speakerPickerOpen.set(false);
    this.moreOpen.set(false);
    this.settingsOpen.set(true);
    this.scheduleControlsHide();
  }

  async openSpeakerPicker() {
    await this.call.refreshMediaDevices();
    if (!this.supportsSpeakerSelection()) {
      this.settingsMessage.set('Sound uses the speaker selected in your device settings.');
      await this.openSettings();
      return;
    }
    this.settingsOpen.set(false);
    this.moreOpen.set(false);
    this.speakerPickerOpen.set(true);
    this.scheduleControlsHide();
    this.lightHaptic();
  }

  async toggleSpeakerOutput() {
    await this.call.refreshMediaDevices();
    if (!this.supportsSpeakerSelection()) {
      this.showActionFeedback('Use your phone sound control to change speaker');
      return;
    }

    const selectedId = this.call.selectedAudioOutputId();
    if (selectedId) {
      this.lastSpeakerOutputId = selectedId;
      await this.chooseAudioOutput('');
      this.showActionFeedback('Phone audio');
      return;
    }

    const outputs = this.speakerOutputs();
    const preferred =
      outputs.find((device) => device.deviceId === this.lastSpeakerOutputId) ??
      outputs.find((device) => /speaker|loudspeaker|speakerphone/i.test(device.label)) ??
      outputs.find((device) => !/earpiece|headset|headphone|bluetooth/i.test(device.label)) ??
      outputs[0];
    if (!preferred) {
      this.showActionFeedback('Your phone controls the current speaker');
      return;
    }
    this.lastSpeakerOutputId = preferred.deviceId;
    await this.chooseAudioOutput(preferred.deviceId);
    this.showActionFeedback('Speaker on');
  }

  speakerOutputActive() {
    return Boolean(this.call.selectedAudioOutputId());
  }

  async toggleMore() {
    if (!this.moreOpen()) await this.call.refreshMediaDevices();
    this.settingsOpen.set(false);
    this.speakerPickerOpen.set(false);
    this.moreOpen.update((open) => !open);
    this.scheduleControlsHide();
  }

  async flipCamera() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const switched = await this.call.cycleVideoInput();
      this.settingsMessage.set(
        switched ? 'Camera switched.' : 'Only one camera is available on this device.'
      );
      if (switched) this.moreOpen.set(false);
      if (switched) this.showActionFeedback('Camera switched');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    await this.callSurfaceRef?.nativeElement.requestFullscreen().catch(() => undefined);
    this.moreOpen.set(false);
  }

  pictureInPictureSupported() {
    return Boolean(
      this.remoteVideoElement &&
      typeof document !== 'undefined' &&
      document.pictureInPictureEnabled &&
      'requestPictureInPicture' in this.remoteVideoElement
    );
  }

  async togglePictureInPicture() {
    if (!this.remoteVideoElement || typeof document === 'undefined') return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.pictureInPicture.set(false);
      } else if (this.pictureInPictureSupported()) {
        await this.remoteVideoElement.requestPictureInPicture();
        this.pictureInPicture.set(true);
        this.moreOpen.set(false);
        this.showActionFeedback('Mini video opened');
      }
    } catch {
      this.settingsMessage.set('Picture-in-picture is unavailable in this browser.');
    }
  }

  async toggleBackgroundBlur() {
    const enabled = !this.call.backgroundBlurEnabled();
    const applied = await this.call.setBackgroundBlur(enabled);
    this.settingsMessage.set(
      applied
        ? enabled
          ? 'Background blur is on.'
          : 'Background blur is off.'
        : 'Background blur is not supported by this browser or camera.'
    );
    if (applied) this.moreOpen.set(false);
    if (applied) this.showActionFeedback(enabled ? 'Background blurred' : 'Background visible');
  }

  async toggleLowDataMode() {
    const enabled = !this.call.lowDataMode();
    await this.call.setLowDataMode(enabled);
    this.showActionFeedback(enabled ? 'Data saver on' : 'Best video quality on');
  }

  async callBack() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.call.callBack(this.iceServers);
    } finally {
      this.busy.set(false);
    }
  }

  async reportProblem() {
    await this.call.reportLastCallProblem();
  }

  showControls() {
    this.controlsHidden.set(false);
    this.scheduleControlsHide();
  }

  onPreviewPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const origin = this.previewOffset();
    this.previewDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.showControls();
  }

  onPreviewPointerMove(event: PointerEvent) {
    const drag = this.previewDrag;
    const element = event.currentTarget as HTMLElement;
    const stage = element.parentElement;
    if (!drag || drag.pointerId !== event.pointerId || !stage) return;
    const inset = 14;
    const defaultLeft = stage.clientWidth - element.offsetWidth - inset;
    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    this.previewOffset.set({
      x: Math.min(0, Math.max(-defaultLeft, nextX)),
      y: Math.min(stage.clientHeight - element.offsetHeight - inset, Math.max(-inset, nextY))
    });
  }

  onPreviewPointerUp(event: PointerEvent) {
    if (this.previewDrag?.pointerId !== event.pointerId) return;
    this.previewDrag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  async chooseAudioOutput(deviceId: string) {
    this.call.selectAudioOutput(deviceId);
    await this.applyAudioOutput(this.remoteAudioElement);
    await this.applyAudioOutput(this.remoteVideoElement);
    this.speakerPickerOpen.set(false);
    this.showActionFeedback('Speaker changed');
    this.scheduleControlsHide();
  }

  supportsSpeakerSelection() {
    return typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
  }

  selectedSpeakerLabel() {
    const selectedId = this.call.selectedAudioOutputId();
    const index = this.call.audioOutputs().findIndex((device) => device.deviceId === selectedId);
    if (index < 0) return 'System speaker';
    return this.deviceLabel(this.call.audioOutputs()[index], index, 'Speaker');
  }

  speakerOutputs() {
    return this.call.audioOutputs().filter((device) => device.deviceId !== 'default');
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
      this.moreOpen.set(false);
      this.showActionFeedback(mode === 'video' ? 'Video on' : 'Voice only');
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
    const elsewhereId = this.call.activeCallElsewhere()?.consultationId || '';
    if (consultationId || recoveryId || elsewhereId) {
      this.moreOpen.set(false);
      this.opened.emit(consultationId || recoveryId || elsewhereId);
    }
  }

  onSurfaceSwipeStart(event: PointerEvent) {
    if (event.button !== 0 || this.call.incomingCall()) return;
    this.surfaceSwipe = { pointerId: event.pointerId, startY: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onSurfaceSwipeMove(event: PointerEvent) {
    if (!this.surfaceSwipe || this.surfaceSwipe.pointerId !== event.pointerId) return;
    this.surfaceSwipeY.set(Math.min(120, Math.max(0, event.clientY - this.surfaceSwipe.startY)));
  }

  onSurfaceSwipeEnd(event: PointerEvent) {
    if (!this.surfaceSwipe || this.surfaceSwipe.pointerId !== event.pointerId) return;
    const shouldMinimize = this.surfaceSwipeY() >= 64;
    this.surfaceSwipe = null;
    this.surfaceSwipeY.set(0);
    if (shouldMinimize) {
      this.minimized.set(true);
      this.lightHaptic();
    }
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
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
    if (!output?.setSinkId) return;
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

  private scheduleControlsHide() {
    this.clearControlsTimer();
    if (
      this.call.state() !== 'connected' ||
      this.call.callMode() !== 'video' ||
      this.settingsOpen() ||
      this.speakerPickerOpen() ||
      this.moreOpen()
    ) {
      this.controlsHidden.set(false);
      return;
    }
    this.controlsTimer = setTimeout(() => this.controlsHidden.set(true), 3_500);
  }

  private clearControlsTimer() {
    if (this.controlsTimer) clearTimeout(this.controlsTimer);
    this.controlsTimer = null;
  }

  private showActionFeedback(message: string) {
    this.actionMessage.set(message);
    this.lightHaptic();
    if (this.actionMessageTimer) clearTimeout(this.actionMessageTimer);
    this.actionMessageTimer = setTimeout(() => this.actionMessage.set(''), 1_500);
  }

  private lightHaptic() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
  }
}
