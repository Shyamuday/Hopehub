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
const CALL_ANSWER_TIMEOUT_MS = 45_000;
const MEDIA_CONNECT_TIMEOUT_MS = 25_000;
const RECONNECT_GRACE_MS = 20_000;
const ICE_RESTART_DELAY_MS = 1_500;
const MAX_ICE_RESTART_ATTEMPTS = 2;
const NETWORK_SAMPLE_INTERVAL_MS = 3_000;
const CALL_TAB_LOCK_TTL_MS = 15_000;
const CALL_TAB_LOCK_REFRESH_MS = 5_000;
const CALL_TAB_LOCK_PREFIX = 'hopehub:active-call:';

export type CallNetworkQuality = 'unknown' | 'good' | 'unstable' | 'poor';

function sdpHasVideo(sdp: string): boolean {
  return /m=video /i.test(sdp);
}

function normalizeIceServers(iceServers: IceServerConfig[]) {
  return [...iceServers].sort((a, b) => {
    const aUrls = Array.isArray(a.urls) ? a.urls : [a.urls];
    const bUrls = Array.isArray(b.urls) ? b.urls : [b.urls];
    const aIsTurn = aUrls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    const bIsTurn = bUrls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    return Number(aIsTurn) - Number(bIsTurn);
  });
}

function callReasonMessage(reason: unknown): string {
  if (typeof reason !== 'string') return 'Call ended.';
  const normalized = reason.trim().toLowerCase();
  const messages: Record<string, string> = {
    active_call_exists: 'Another call is already active in this session.',
    consultation_call_already_active: 'A call is already active in this session.',
    call_unavailable: 'Call is not available right now.',
    rejected: 'Call was declined.',
    no_answer: 'No answer yet. Please try again or send a message.',
    media_timeout: 'Call could not connect. Please try again or continue in chat.',
    connection_failed: 'Call connection failed. Please try again or continue in chat.',
    reconnect_timeout: 'Call disconnected. Please try again or continue in chat.',
    not_connected: 'Call ended before it connected.',
    ended_by_user: 'Call ended.',
    switch_to_video: 'Switching to video.',
    switch_to_voice: 'Switching to voice.',
    consultation_not_found: 'This session could not be found.',
    consultation_not_active: 'Calls are available only during an active session.',
    provider_not_assigned: 'An expert is not assigned to this session yet.',
    call_participant_mismatch: 'This call is not allowed for this session.',
    call_mode_not_allowed: 'This session does not allow this call type.',
    call_not_allowed: 'This call is not allowed.',
    call_not_active: 'This call is no longer active.',
    rate_limited: 'Too many call requests were sent. Wait a moment and try again.',
    invalid_call_id: 'This call request is invalid. Start a new call.',
    stale_call_signal: 'An old call update was ignored.'
  };
  return messages[normalized] || normalized.replace(/_/g, ' ');
}

function mediaAccessErrorMessage(error: unknown, mode: CallMode): string {
  const needsCamera = mode === 'video';
  const deviceLabel = needsCamera ? 'camera and microphone' : 'microphone';
  const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  const errorMessage = error instanceof Error ? error.message : '';

  if (errorMessage === 'MEDIA_NOT_SUPPORTED') {
    return `This browser cannot access the ${deviceLabel}. Open Hope Hub in a current Chrome, Edge, Firefox, or Safari browser.`;
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return `The ${deviceLabel} can only be used on a secure HTTPS page.`;
  }

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    return `${needsCamera ? 'Camera or microphone' : 'Microphone'} is blocked. Allow access from the browser address-bar lock icon, then retry.`;
  }
  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return `No ${deviceLabel} was found. Connect a device and retry.`;
  }
  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return `The ${deviceLabel} is busy in another app. Close the other call or recording app, then retry.`;
  }
  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return `The selected ${deviceLabel} is unavailable. Choose another device in browser settings and retry.`;
  }

  return needsCamera
    ? 'Could not start the camera or microphone. Check browser permission and retry.'
    : 'Could not start the microphone. Check browser permission and retry.';
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
  readonly audioInputs = signal<MediaDeviceInfo[]>([]);
  readonly videoInputs = signal<MediaDeviceInfo[]>([]);
  readonly audioOutputs = signal<MediaDeviceInfo[]>([]);
  readonly selectedAudioInputId = signal('');
  readonly selectedVideoInputId = signal('');
  readonly selectedAudioOutputId = signal('');
  readonly networkQuality = signal<CallNetworkQuality>('unknown');
  readonly incomingAlertsEnabled = signal(false);
  readonly privacyRelay = signal(false);
  readonly connectionOnline = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly voiceFallbackSuggested = signal(false);

  private pc: RTCPeerConnection | null = null;
  private socket: CallSignalingSocket | null = null;
  private callContext: { consultationId: string; targetUserId: string } | null = null;
  private boundSocketId: symbol | null = null;
  private ensureMediaAccess: ((mode: CallMode) => Promise<MediaAccessResult>) | null = null;
  private iceQueue: RTCIceCandidateInit[] = [];
  private answerTimeout: ReturnType<typeof setTimeout> | null = null;
  private mediaTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private iceRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private networkSampleTimer: ReturnType<typeof setInterval> | null = null;
  private callHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private ringtoneTimer: ReturnType<typeof setInterval> | null = null;
  private ringtoneContext: AudioContext | null = null;
  private incomingNotification: Notification | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private isInitiator = false;
  private activeCallId = '';
  private signalSequence = 0;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private iceRestartAttempts = 0;
  private totalReconnectCount = 0;
  private iceRestartInProgress = false;
  private latestNetworkMetrics = {
    packetLossPercent: 0,
    maxJitterMs: 0,
    averageRttMs: 0
  };
  private consecutivePoorSamples = 0;
  private readonly callTabId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `call-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private callLockKey = '';
  private callLockHeartbeat: ReturnType<typeof setInterval> | null = null;
  private beforeUnloadBound = false;
  private readonly releaseLockBeforeUnload = () => this.releaseCallLock();
  private readonly handleOnline = () => {
    this.connectionOnline.set(true);
    if (this.callContext && this.pc) {
      this.state.set('reconnecting');
      this.startReconnectTimeout();
      void this.attemptIceRestart(true);
    }
  };
  private readonly handleOffline = () => {
    this.connectionOnline.set(false);
    if (this.callContext) {
      this.state.set('reconnecting');
      this.startReconnectTimeout();
    }
  };
  private readonly handlePageHide = (event: PageTransitionEvent) => {
    if (event.persisted || !this.callContext) return;
    this.emitSignal(CALL_SOCKET_EVENTS.END, {
      ...this.callContext,
      reason: 'page_closed',
      metadata: this.callMetadata()
    });
    this.releaseCallLock();
  };
  private readonly handleVisibilityChange = () => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    if (this.state() === 'connected') void this.acquireWakeLock();
    if (this.state() === 'reconnecting') void this.attemptIceRestart(true);
  };
  private observedCallLockKey = '';
  private storageListenerBound = false;
  private readonly handleCallLockStorage = (event: StorageEvent) => {
    if (!this.observedCallLockKey || event.key !== this.observedCallLockKey || !event.newValue)
      return;
    const lock = this.readCallLock(this.observedCallLockKey);
    if (!lock || lock.tabId === this.callTabId || lock.expiresAt <= Date.now()) return;
    this.stopIncomingAlert();
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    if (this.state() === 'ringing') this.state.set('ended');
    this.error.set('This call was opened in another browser tab.');
  };

  bindSocket(socket: CallSignalingSocket) {
    if (this.socket === socket && this.boundSocketId) return;

    this.unbindSocketListeners();
    this.socket = socket;
    this.boundSocketId = Symbol('call-socket');
    if (typeof window !== 'undefined' && !this.storageListenerBound) {
      window.addEventListener('storage', this.handleCallLockStorage);
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('pagehide', this.handlePageHide);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.storageListenerBound = true;
    }

    socket.on('connect', () => {
      if (!this.callContext || !this.activeCallId) return;
      this.emitSignal(CALL_SOCKET_EVENTS.SYNC, {
        ...this.callContext,
        mode: this.callMode()
      });
    });

    socket.on('disconnect', () => {
      if (!this.callContext || this.state() === 'ended') return;
      this.state.set('reconnecting');
      this.startReconnectTimeout();
    });

    socket.on(CALL_SOCKET_EVENTS.STATE, (raw: unknown) => {
      const payload = raw as { active?: boolean; callId?: string };
      if (!this.callContext || !payload.active) return;
      if (payload.callId && payload.callId !== this.activeCallId) return;
      void this.attemptIceRestart(true);
    });

    socket.on(CALL_SOCKET_EVENTS.RING, (raw: unknown) => {
      const payload = raw as { fromUserId?: string; consultationId?: string; callId?: string };
      if (!payload?.fromUserId) return;
      if (this.activeCallId && payload.callId && payload.callId !== this.activeCallId) return;
      if (payload.consultationId) {
        this.observedCallLockKey = `${CALL_TAB_LOCK_PREFIX}${payload.consultationId}`;
      }
      if (payload.callId) this.activeCallId = payload.callId;
      this.incomingCall.set(true);
      if (this.state() === 'idle') this.state.set('ringing');
      void this.startIncomingAlert();
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

    socket.on(CALL_SOCKET_EVENTS.END, (raw: unknown) => this.onRemoteCallClosed(raw));
    socket.on(CALL_SOCKET_EVENTS.REJECT, (raw: unknown) => this.onRemoteCallClosed(raw));
  }

  setMediaAccessHandler(handler: (mode: CallMode) => Promise<MediaAccessResult>) {
    this.ensureMediaAccess = handler;
  }

  async refreshMediaDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === 'audioinput');
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');
      this.audioInputs.set(audioInputs);
      this.videoInputs.set(videoInputs);
      this.audioOutputs.set(audioOutputs);
      this.keepAvailableDeviceSelection(this.selectedAudioInputId, audioInputs);
      this.keepAvailableDeviceSelection(this.selectedVideoInputId, videoInputs);
      this.keepAvailableDeviceSelection(this.selectedAudioOutputId, audioOutputs);
    } catch {
      // Device enumeration is optional and may be unavailable before permission is granted.
    }
  }

  async selectAudioInput(deviceId: string) {
    const previousId = this.selectedAudioInputId();
    this.selectedAudioInputId.set(deviceId);
    if (!this.localStream()) return;
    try {
      await this.replaceLocalTrack('audio', deviceId);
    } catch (error) {
      this.selectedAudioInputId.set(previousId);
      const message = mediaAccessErrorMessage(error, 'audio');
      this.error.set(message);
      throw new Error(message);
    }
  }

  async selectVideoInput(deviceId: string) {
    const previousId = this.selectedVideoInputId();
    this.selectedVideoInputId.set(deviceId);
    if (!this.localStream() || this.callMode() !== 'video') return;
    try {
      await this.replaceLocalTrack('video', deviceId);
    } catch (error) {
      this.selectedVideoInputId.set(previousId);
      const message = mediaAccessErrorMessage(error, 'video');
      this.error.set(message);
      throw new Error(message);
    }
  }

  selectAudioOutput(deviceId: string) {
    this.selectedAudioOutputId.set(deviceId);
  }

  async enableIncomingAlerts() {
    if (typeof window === 'undefined') return false;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor) {
      this.ringtoneContext ||= new AudioContextConstructor();
      try {
        await this.ringtoneContext.resume();
      } catch {
        // The browser may still require its site-level sound permission.
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Ringtone remains available when notifications are unsupported or denied.
      }
    }

    const enabled = this.ringtoneContext?.state === 'running';
    this.incomingAlertsEnabled.set(enabled);
    return enabled;
  }

  async testSpeaker() {
    await this.playRingTone();
    return this.incomingAlertsEnabled();
  }

  async startCall(params: {
    socket: CallSignalingSocket;
    consultationId: string;
    targetUserId: string;
    mode: CallMode;
    iceServers?: IceServerConfig[];
    privacyRelay?: boolean;
  }) {
    if (!this.acquireCallLock(params.consultationId)) {
      const message = 'This call is already open in another browser tab.';
      this.error.set(message);
      this.state.set('error');
      throw new Error(message);
    }
    this.bindSocket(params.socket);
    this.callContext = { consultationId: params.consultationId, targetUserId: params.targetUserId };
    this.incomingCall.set(false);
    this.stopIncomingAlert();
    this.isInitiator = true;
    this.activeCallId = this.newCallId();
    this.signalSequence = 0;
    this.iceRestartAttempts = 0;
    this.totalReconnectCount = 0;
    this.privacyRelay.set(params.privacyRelay === true);
    this.voiceFallbackSuggested.set(false);
    this.callMode.set(params.mode);
    this.error.set('');

    try {
      await this.ensurePeer(params.mode, params.iceServers ?? DEFAULT_STUN, this.privacyRelay());
      this.makingOffer = true;
      await this.pc!.setLocalDescription();
      const offer = this.pc!.localDescription!;
      this.makingOffer = false;

      this.state.set('ringing');
      this.emitSignal(CALL_SOCKET_EVENTS.RING, {
        consultationId: params.consultationId,
        targetUserId: params.targetUserId,
        mode: params.mode,
        metadata: { ...this.callMetadata(), privacyRelay: this.privacyRelay() }
      });
      this.emitSignal(CALL_SOCKET_EVENTS.OFFER, {
        consultationId: params.consultationId,
        targetUserId: params.targetUserId,
        mode: params.mode,
        sdp: offer,
        metadata: { ...this.callMetadata(), privacyRelay: this.privacyRelay() }
      });
      this.startAnswerTimeout();
    } catch (error) {
      this.makingOffer = false;
      this.releaseCallLock();
      throw error;
    }
  }

  async acceptIncoming(iceServers: IceServerConfig[] = DEFAULT_STUN) {
    const offer = this.pendingOffer();
    if (!offer || !this.socket) return;
    if (!this.acquireCallLock(offer.consultationId)) {
      this.error.set('This call is already open in another browser tab.');
      this.state.set('error');
      return;
    }

    this.activeCallId = offer.callId;
    this.signalSequence = 0;
    this.callContext = {
      consultationId: offer.consultationId,
      targetUserId: offer.fromUserId
    };
    this.callMode.set(offer.mode);
    this.error.set('');
    this.incomingCall.set(false);
    this.stopIncomingAlert();
    this.isInitiator = false;
    this.iceRestartAttempts = 0;
    this.totalReconnectCount = 0;

    try {
      await this.ensurePeer(offer.mode, iceServers, this.privacyRelay());
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      await this.flushIceQueue();
      this.emitSignal(CALL_SOCKET_EVENTS.ANSWER, {
        consultationId: offer.consultationId,
        targetUserId: offer.fromUserId,
        sdp: answer
      });
      this.pendingOffer.set(null);
      this.startMediaTimeout();
    } catch (err) {
      this.releaseCallLock();
      this.error.set(err instanceof Error ? err.message : 'Could not join call.');
      this.state.set('error');
    }
  }

  rejectCall(params: { consultationId: string; targetUserId: string; reason?: string }) {
    this.emitSignal(CALL_SOCKET_EVENTS.REJECT, {
      ...params,
      reason: params.reason || 'rejected',
      metadata: this.callMetadata()
    });
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.cleanup('ended');
  }

  async endCall(params: { consultationId: string; targetUserId: string; reason?: string }) {
    this.emitSignal(CALL_SOCKET_EVENTS.END, {
      ...params,
      reason: params.reason || 'ended_by_user',
      metadata: await this.callMetadataWithStats()
    });
    this.cleanup('ended');
  }

  setMicEnabled(enabled: boolean) {
    this.localStream()
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream()
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  cleanup(state: CallState = 'idle') {
    this.clearCallTimers();
    this.stopIncomingAlert();
    this.stopNetworkSampling();
    this.stopCallHeartbeat();
    void this.releaseWakeLock();
    this.releaseCallLock();
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
    this.observedCallLockKey = '';
    this.isInitiator = false;
    this.activeCallId = '';
    this.signalSequence = 0;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;
    this.iceRestartAttempts = 0;
    this.totalReconnectCount = 0;
    this.iceRestartInProgress = false;
    this.latestNetworkMetrics = {
      packetLossPercent: 0,
      maxJitterMs: 0,
      averageRttMs: 0
    };
    this.consecutivePoorSamples = 0;
    this.networkQuality.set('unknown');
    this.voiceFallbackSuggested.set(false);
    this.state.set(state);
    this.error.set('');
  }

  private async onRemoteOffer(raw: unknown) {
    const payload = raw as {
      fromUserId?: string;
      consultationId?: string;
      mode?: CallMode;
      sdp?: RTCSessionDescriptionInit;
      metadata?: Record<string, unknown>;
      callId?: string;
    };
    if (!payload?.fromUserId || !payload.consultationId || !payload.sdp?.sdp || !payload.callId)
      return;
    this.observedCallLockKey = `${CALL_TAB_LOCK_PREFIX}${payload.consultationId}`;

    if (this.pc && !this.matchesCallContext(payload)) return;
    if (this.pc) {
      const readyForOffer =
        !this.makingOffer &&
        (this.pc.signalingState === 'stable' || this.isSettingRemoteAnswerPending);
      const offerCollision = !readyForOffer;
      this.ignoreOffer = this.isInitiator && offerCollision;
      if (this.ignoreOffer) return;
      try {
        if (payload.metadata?.['iceRestart'] === true) this.state.set('reconnecting');
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await this.pc.setLocalDescription();
        const answer = this.pc.localDescription!;
        await this.flushIceQueue();
        this.emitSignal(CALL_SOCKET_EVENTS.ANSWER, {
          consultationId: payload.consultationId,
          targetUserId: payload.fromUserId,
          mode: this.callMode(),
          sdp: answer,
          metadata: { iceRestart: payload.metadata?.['iceRestart'] === true }
        });
      } catch {
        this.startReconnectTimeout();
      }
      return;
    }

    const mode: CallMode =
      payload.mode === 'video' ? 'video' : sdpHasVideo(payload.sdp.sdp) ? 'video' : 'audio';
    this.activeCallId = payload.callId;
    this.privacyRelay.set(payload.metadata?.['privacyRelay'] === true);
    this.callMode.set(mode);
    this.pendingOffer.set({
      callId: payload.callId,
      fromUserId: payload.fromUserId,
      consultationId: payload.consultationId,
      sdp: payload.sdp,
      mode
    });
    this.incomingCall.set(true);
    this.state.set('ringing');
    void this.startIncomingAlert();
  }

  private async onRemoteAnswer(raw: unknown) {
    const payload = raw as {
      consultationId?: string;
      fromUserId?: string;
      sdp?: RTCSessionDescriptionInit;
      callId?: string;
    };
    if (!payload?.sdp || !this.pc) return;
    if (!this.matchesCallContext(payload)) return;
    this.clearAnswerTimeout();
    this.isSettingRemoteAnswerPending = true;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    } finally {
      this.isSettingRemoteAnswerPending = false;
    }
    await this.flushIceQueue();
    this.startMediaTimeout();
  }

  private async onRemoteIce(raw: unknown) {
    const payload = raw as {
      consultationId?: string;
      fromUserId?: string;
      candidate?: RTCIceCandidateInit;
      callId?: string;
    };
    if (!payload?.candidate) return;
    if (!this.matchesCallContext(payload)) return;
    if (!this.pc?.remoteDescription) {
      this.iceQueue.push(payload.candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      if (!this.ignoreOffer)
        this.error.set('A network candidate could not be applied. Reconnecting…');
    }
  }

  private onRemoteCallClosed(raw: unknown) {
    const payload = raw as {
      consultationId?: string;
      fromUserId?: string;
      callId?: string;
      reason?: string;
    };
    if (!this.matchesCallContext(payload)) return;
    const message = callReasonMessage(payload?.reason);
    this.cleanup('ended');
    if (
      payload?.reason &&
      payload.reason !== 'ended_by_user' &&
      !payload.reason.startsWith('switch_to_')
    ) {
      this.error.set(message);
    }
  }

  private matchesCallContext(payload: {
    consultationId?: string;
    fromUserId?: string;
    callId?: string;
  }) {
    if (!this.callContext) return true;
    if (payload.consultationId && payload.consultationId !== this.callContext.consultationId) {
      return false;
    }
    if (payload.fromUserId && payload.fromUserId !== this.callContext.targetUserId) {
      return false;
    }
    if (payload.callId && this.activeCallId && payload.callId !== this.activeCallId) return false;
    return true;
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

  private async ensurePeer(
    mode: CallMode,
    iceServers: IceServerConfig[] = DEFAULT_STUN,
    privacyRelay = false
  ) {
    if (this.pc) return;

    if (this.ensureMediaAccess) {
      const access = await this.ensureMediaAccess(mode);
      if (!access.granted) {
        this.error.set(access.message ?? 'Camera or microphone permission required.');
        this.state.set('error');
        throw new Error(access.message ?? 'Media permission denied');
      }
    }

    let stream: MediaStream;
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('MEDIA_NOT_SUPPORTED');
      }
      stream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints(mode));
    } catch (error) {
      const message = mediaAccessErrorMessage(error, mode);
      this.error.set(message);
      this.state.set('error');
      throw new Error(message);
    }

    this.pc = new RTCPeerConnection({
      iceServers: normalizeIceServers(iceServers),
      iceTransportPolicy: privacyRelay ? 'relay' : 'all'
    });
    this.localStream.set(stream);
    void this.refreshMediaDevices();

    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }
    if (mode === 'video') await this.applyVideoProfile('balanced');

    this.pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (remote) this.remoteStream.set(remote);
    };

    this.pc.onicecandidate = (event) => {
      if (!event.candidate || !this.socket || !this.callContext) return;
      this.emitSignal(CALL_SOCKET_EVENTS.ICE, {
        consultationId: this.callContext.consultationId,
        targetUserId: this.callContext.targetUserId,
        candidate: event.candidate.toJSON()
      });
    };

    this.pc.onconnectionstatechange = () => this.handlePeerConnectionState();
    this.pc.oniceconnectionstatechange = () => this.handlePeerConnectionState();

    this.state.set('connecting');
  }

  private mediaConstraints(mode: CallMode): MediaStreamConstraints {
    const audioDeviceId = this.selectedAudioInputId();
    const videoDeviceId = this.selectedVideoInputId();
    return {
      audio: {
        ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video:
        mode === 'video'
          ? videoDeviceId
            ? {
                deviceId: { exact: videoDeviceId },
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 24, max: 30 }
              }
            : {
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 24, max: 30 }
              }
          : false
    };
  }

  private keepAvailableDeviceSelection(
    selected: { (): string; set(value: string): void },
    devices: MediaDeviceInfo[]
  ) {
    const selectedId = selected();
    if (selectedId && !devices.some((device) => device.deviceId === selectedId)) {
      selected.set('');
    }
  }

  private async replaceLocalTrack(kind: 'audio' | 'video', deviceId: string) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('MEDIA_NOT_SUPPORTED');
    }

    const replacementStream = await navigator.mediaDevices.getUserMedia({
      audio: kind === 'audio' ? (deviceId ? { deviceId: { exact: deviceId } } : true) : false,
      video: kind === 'video' ? (deviceId ? { deviceId: { exact: deviceId } } : true) : false
    });
    const replacementTrack =
      kind === 'audio'
        ? replacementStream.getAudioTracks()[0]
        : replacementStream.getVideoTracks()[0];
    if (!replacementTrack) {
      replacementStream.getTracks().forEach((track) => track.stop());
      throw new Error(`No ${kind} device is available.`);
    }

    const currentStream = this.localStream();
    if (!currentStream) {
      replacementStream.getTracks().forEach((track) => track.stop());
      return;
    }

    const sender = this.pc?.getSenders().find((candidate) => candidate.track?.kind === kind);
    if (this.pc && !sender) {
      replacementTrack.stop();
      throw new Error(`The active call has no ${kind} track to replace.`);
    }
    try {
      await sender?.replaceTrack(replacementTrack);
      const retainedTracks = currentStream.getTracks().filter((track) => track.kind !== kind);
      currentStream
        .getTracks()
        .filter((track) => track.kind === kind)
        .forEach((track) => track.stop());
      this.localStream.set(new MediaStream([...retainedTracks, replacementTrack]));
      await this.refreshMediaDevices();
    } catch (error) {
      replacementTrack.stop();
      throw error;
    }
  }

  private acquireCallLock(consultationId: string) {
    if (typeof localStorage === 'undefined') return true;
    const key = `${CALL_TAB_LOCK_PREFIX}${consultationId}`;
    this.observedCallLockKey = key;
    const now = Date.now();
    try {
      const current = this.readCallLock(key);
      if (current && current.tabId !== this.callTabId && current.expiresAt > now) return false;

      localStorage.setItem(
        key,
        JSON.stringify({ tabId: this.callTabId, expiresAt: now + CALL_TAB_LOCK_TTL_MS })
      );
      const confirmed = this.readCallLock(key);
      if (!confirmed || confirmed.tabId !== this.callTabId) return false;

      this.releaseCallLock();
      this.callLockKey = key;
      this.refreshCallLock();
      this.callLockHeartbeat = setInterval(() => this.refreshCallLock(), CALL_TAB_LOCK_REFRESH_MS);
      if (typeof window !== 'undefined' && !this.beforeUnloadBound) {
        window.addEventListener('beforeunload', this.releaseLockBeforeUnload);
        this.beforeUnloadBound = true;
      }
      return true;
    } catch {
      return true;
    }
  }

  private readCallLock(key: string): { tabId: string; expiresAt: number } | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      const parsed = JSON.parse(value) as { tabId?: unknown; expiresAt?: unknown };
      if (typeof parsed.tabId !== 'string' || typeof parsed.expiresAt !== 'number') return null;
      return { tabId: parsed.tabId, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  private refreshCallLock() {
    if (!this.callLockKey || typeof localStorage === 'undefined') return;
    const current = this.readCallLock(this.callLockKey);
    if (current && current.tabId !== this.callTabId && current.expiresAt > Date.now()) {
      this.releaseCallLock();
      void this.failCall('active_call_exists', 'This call was continued in another browser tab.');
      return;
    }
    localStorage.setItem(
      this.callLockKey,
      JSON.stringify({ tabId: this.callTabId, expiresAt: Date.now() + CALL_TAB_LOCK_TTL_MS })
    );
  }

  private releaseCallLock() {
    if (this.callLockHeartbeat) clearInterval(this.callLockHeartbeat);
    this.callLockHeartbeat = null;
    if (this.callLockKey && typeof localStorage !== 'undefined') {
      const current = this.readCallLock(this.callLockKey);
      if (current?.tabId === this.callTabId) localStorage.removeItem(this.callLockKey);
    }
    this.callLockKey = '';
    if (typeof window !== 'undefined' && this.beforeUnloadBound) {
      window.removeEventListener('beforeunload', this.releaseLockBeforeUnload);
      this.beforeUnloadBound = false;
    }
  }

  private handlePeerConnectionState() {
    const pc = this.pc;
    if (!pc) return;

    const connectionState = pc.connectionState;
    const iceState = pc.iceConnectionState;
    if (connectionState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      this.clearMediaTimeout();
      this.clearReconnectTimeout();
      this.state.set('connected');
      this.iceRestartAttempts = 0;
      this.iceRestartInProgress = false;
      this.clearIceRestartTimer();
      this.startNetworkSampling();
      this.startCallHeartbeat();
      void this.acquireWakeLock();
      return;
    }

    if (connectionState === 'failed' || iceState === 'failed') {
      this.state.set('reconnecting');
      this.startReconnectTimeout();
      void this.attemptIceRestart();
      return;
    }

    if (connectionState === 'disconnected' || iceState === 'disconnected') {
      if (this.state() === 'connected') this.state.set('reconnecting');
      this.startReconnectTimeout();
      this.scheduleIceRestart();
    }
  }

  private scheduleIceRestart() {
    if (this.iceRestartTimer || this.iceRestartInProgress) return;
    this.iceRestartTimer = setTimeout(() => {
      this.iceRestartTimer = null;
      void this.attemptIceRestart();
    }, ICE_RESTART_DELAY_MS);
  }

  private async attemptIceRestart(force = false) {
    if (
      !this.pc ||
      !this.socket ||
      !this.callContext ||
      this.iceRestartInProgress ||
      (!force && this.iceRestartAttempts >= MAX_ICE_RESTART_ATTEMPTS)
    ) {
      return;
    }

    this.iceRestartInProgress = true;
    this.iceRestartAttempts += 1;
    this.totalReconnectCount += 1;
    try {
      this.pc.restartIce?.();
      this.makingOffer = true;
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.emitSignal(CALL_SOCKET_EVENTS.OFFER, {
        consultationId: this.callContext.consultationId,
        targetUserId: this.callContext.targetUserId,
        mode: this.callMode(),
        sdp: offer,
        metadata: {
          iceRestart: true,
          attempt: this.iceRestartAttempts,
          ...this.callMetadata()
        }
      });
    } catch {
      if (this.iceRestartAttempts < MAX_ICE_RESTART_ATTEMPTS) this.scheduleIceRestart();
    } finally {
      this.makingOffer = false;
      this.iceRestartInProgress = false;
    }
  }

  private startNetworkSampling() {
    if (this.networkSampleTimer) return;
    void this.sampleNetworkQuality();
    this.networkSampleTimer = setInterval(
      () => void this.sampleNetworkQuality(),
      NETWORK_SAMPLE_INTERVAL_MS
    );
  }

  private stopNetworkSampling() {
    if (this.networkSampleTimer) clearInterval(this.networkSampleTimer);
    this.networkSampleTimer = null;
  }

  private startCallHeartbeat() {
    if (this.callHeartbeatTimer || !this.callContext) return;
    this.callHeartbeatTimer = setInterval(() => {
      if (!this.callContext || this.state() !== 'connected') return;
      this.emitSignal(CALL_SOCKET_EVENTS.HEARTBEAT, {
        ...this.callContext,
        mode: this.callMode()
      });
    }, 20_000);
  }

  private stopCallHeartbeat() {
    if (this.callHeartbeatTimer) clearInterval(this.callHeartbeatTimer);
    this.callHeartbeatTimer = null;
  }

  private async acquireWakeLock() {
    if (this.wakeLock || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch {
      // Wake lock is optional and may be denied by battery-saving settings.
    }
  }

  private async releaseWakeLock() {
    const lock = this.wakeLock;
    this.wakeLock = null;
    await lock?.release().catch(() => undefined);
  }

  private async sampleNetworkQuality() {
    if (!this.pc?.getStats || this.state() !== 'connected') return;
    try {
      const stats = await this.pc.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      let jitter = 0;
      let roundTripTime = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && !report.isRemote) {
          packetsLost += Number(report.packetsLost || 0);
          packetsReceived += Number(report.packetsReceived || 0);
          jitter = Math.max(jitter, Number(report.jitter || 0));
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = Math.max(roundTripTime, Number(report.currentRoundTripTime || 0));
        }
      });

      const totalPackets = packetsLost + packetsReceived;
      const lossPercent = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;
      this.latestNetworkMetrics = {
        packetLossPercent: Math.round(lossPercent * 100) / 100,
        maxJitterMs: Math.round(jitter * 1_000),
        averageRttMs: Math.round(roundTripTime * 1_000)
      };
      if (lossPercent >= 8 || jitter >= 0.08 || roundTripTime >= 0.6) {
        this.networkQuality.set('poor');
        this.consecutivePoorSamples += 1;
        if (this.callMode() === 'video') {
          void this.applyVideoProfile('low');
          if (this.consecutivePoorSamples >= 3) this.voiceFallbackSuggested.set(true);
        }
      } else if (lossPercent >= 3 || jitter >= 0.03 || roundTripTime >= 0.25) {
        this.networkQuality.set('unstable');
        this.consecutivePoorSamples = 0;
        if (this.callMode() === 'video') void this.applyVideoProfile('low');
      } else {
        this.networkQuality.set('good');
        this.consecutivePoorSamples = 0;
        this.voiceFallbackSuggested.set(false);
        if (this.callMode() === 'video') void this.applyVideoProfile('balanced');
      }
    } catch {
      this.networkQuality.set('unknown');
    }
  }

  private async applyVideoProfile(profile: 'balanced' | 'low') {
    const sender = this.pc?.getSenders().find((item) => item.track?.kind === 'video');
    if (!sender?.track) return;
    try {
      const parameters = sender.getParameters();
      parameters.encodings ??= [{}];
      parameters.encodings[0] = {
        ...parameters.encodings[0],
        maxBitrate: profile === 'low' ? 250_000 : 700_000,
        maxFramerate: profile === 'low' ? 15 : 24,
        scaleResolutionDownBy: profile === 'low' ? 2 : 1
      };
      await sender.setParameters(parameters);
      await sender.track.applyConstraints({
        width: { ideal: profile === 'low' ? 320 : 640 },
        height: { ideal: profile === 'low' ? 180 : 360 },
        frameRate: { ideal: profile === 'low' ? 15 : 24, max: profile === 'low' ? 18 : 30 }
      });
    } catch {
      // Browsers may support only part of the sender parameter surface.
    }
  }

  private async startIncomingAlert() {
    if (this.ringtoneTimer) return;
    await this.playRingTone();
    this.ringtoneTimer = setInterval(() => void this.playRingTone(), 1_800);
    if (
      typeof document !== 'undefined' &&
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      this.incomingNotification?.close();
      this.incomingNotification = new Notification('Incoming Hope Hub call', {
        body: 'Open the session to accept or decline.'
      });
    }
  }

  private stopIncomingAlert() {
    if (this.ringtoneTimer) clearInterval(this.ringtoneTimer);
    this.ringtoneTimer = null;
    this.incomingNotification?.close();
    this.incomingNotification = null;
  }

  private async playRingTone() {
    if (typeof window === 'undefined') return;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    this.ringtoneContext ||= new AudioContextConstructor();
    try {
      await this.ringtoneContext.resume();
      if (this.ringtoneContext.state !== 'running') return;
      this.incomingAlertsEnabled.set(true);
      const oscillator = this.ringtoneContext.createOscillator();
      const gain = this.ringtoneContext.createGain();
      const now = this.ringtoneContext.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(680, now);
      oscillator.frequency.setValueAtTime(820, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      oscillator.connect(gain);
      gain.connect(this.ringtoneContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.44);
    } catch {
      this.incomingAlertsEnabled.set(false);
    }
  }

  private startAnswerTimeout() {
    this.clearAnswerTimeout();
    this.answerTimeout = setTimeout(() => {
      if (this.state() !== 'ringing') return;
      void this.failCall('no_answer', 'No answer yet. Please try again or send a message.');
    }, CALL_ANSWER_TIMEOUT_MS);
  }

  private startMediaTimeout() {
    this.clearMediaTimeout();
    this.mediaTimeout = setTimeout(() => {
      if (this.state() === 'connected' || this.state() === 'ended') return;
      void this.failCall(
        'media_timeout',
        'Call could not connect. Please try again or continue in chat.'
      );
    }, MEDIA_CONNECT_TIMEOUT_MS);
  }

  private startReconnectTimeout() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      if (this.state() !== 'reconnecting') return;
      void this.failCall(
        'reconnect_timeout',
        'Call disconnected. Please try again or continue in chat.'
      );
    }, RECONNECT_GRACE_MS);
  }

  private async failCall(reason: string, message: string) {
    const context = this.callContext;
    if (context) {
      this.emitSignal(CALL_SOCKET_EVENTS.END, {
        ...context,
        reason,
        metadata: await this.callMetadataWithStats()
      });
    }
    this.cleanup('ended');
    this.error.set(message);
  }

  private clearAnswerTimeout() {
    if (!this.answerTimeout) return;
    clearTimeout(this.answerTimeout);
    this.answerTimeout = null;
  }

  private clearMediaTimeout() {
    if (!this.mediaTimeout) return;
    clearTimeout(this.mediaTimeout);
    this.mediaTimeout = null;
  }

  private clearReconnectTimeout() {
    if (!this.reconnectTimeout) return;
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private clearIceRestartTimer() {
    if (!this.iceRestartTimer) return;
    clearTimeout(this.iceRestartTimer);
    this.iceRestartTimer = null;
  }

  private clearCallTimers() {
    this.clearAnswerTimeout();
    this.clearMediaTimeout();
    this.clearReconnectTimeout();
    this.clearIceRestartTimer();
  }

  private callMetadata(): Record<string, unknown> {
    return {
      userAgent:
        typeof navigator !== 'undefined' && 'userAgent' in navigator
          ? navigator.userAgent
          : undefined,
      platform:
        typeof navigator !== 'undefined' && 'platform' in navigator
          ? navigator.platform
          : undefined,
      connectionState: this.pc?.connectionState,
      iceConnectionState: this.pc?.iceConnectionState,
      mode: this.callMode()
    };
  }

  setPrivacyRelay(enabled: boolean) {
    this.privacyRelay.set(enabled);
  }

  async testConnectivity(
    iceServers: IceServerConfig[],
    requireRelay = false
  ): Promise<{ ok: boolean; relay: boolean; message: string }> {
    if (typeof RTCPeerConnection === 'undefined') {
      return { ok: false, relay: false, message: 'WebRTC is not supported in this browser.' };
    }
    const pc = new RTCPeerConnection({
      iceServers: normalizeIceServers(iceServers),
      iceTransportPolicy: requireRelay ? 'relay' : 'all'
    });
    let foundCandidate = false;
    let foundRelay = false;
    try {
      pc.createDataChannel('hopehub-connectivity-test');
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        foundCandidate = true;
        if (event.candidate.type === 'relay' || / typ relay /i.test(event.candidate.candidate)) {
          foundRelay = true;
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 6_000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState !== 'complete') return;
          clearTimeout(timeout);
          resolve();
        };
      });
      const ok = requireRelay ? foundRelay : foundCandidate;
      return {
        ok,
        relay: foundRelay,
        message: ok
          ? foundRelay
            ? 'Private relay connection is ready.'
            : 'Direct browser connection is ready.'
          : requireRelay
            ? 'Private relay is unavailable. Check TURN configuration or use standard connection.'
            : 'No usable network path was found. Check your connection and retry.'
      };
    } catch {
      return { ok: false, relay: false, message: 'Could not complete the connection test.' };
    } finally {
      pc.close();
    }
  }

  private emitSignal(event: string, payload: Record<string, unknown>) {
    if (!this.socket || !this.activeCallId) return;
    this.signalSequence += 1;
    this.socket.emit(event, {
      ...payload,
      callId: this.activeCallId,
      sequence: this.signalSequence
    });
  }

  private newCallId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async callMetadataWithStats(): Promise<Record<string, unknown>> {
    const candidateMetadata = await this.selectedCandidateMetadata();
    return {
      ...this.callMetadata(),
      ...candidateMetadata,
      qualitySummary: {
        quality: this.networkQuality(),
        reconnectCount: this.totalReconnectCount,
        usedTurnRelay: candidateMetadata['usedTurnRelay'] === true,
        ...this.latestNetworkMetrics
      }
    };
  }

  private async selectedCandidateMetadata(): Promise<Record<string, unknown>> {
    if (!this.pc?.getStats) return {};
    try {
      const stats = await this.pc.getStats();
      let selectedPair: RTCStats | undefined;
      stats.forEach((report) => {
        const item = report as RTCStats & {
          selected?: boolean;
          nominated?: boolean;
          state?: string;
          localCandidateId?: string;
          remoteCandidateId?: string;
          currentRoundTripTime?: number;
          bytesSent?: number;
          bytesReceived?: number;
        };
        if (
          item.type === 'candidate-pair' &&
          (item.selected || (item.nominated && item.state === 'succeeded'))
        ) {
          selectedPair = item;
        }
      });
      if (!selectedPair) return {};

      const pair = selectedPair as RTCStats & {
        localCandidateId?: string;
        remoteCandidateId?: string;
        currentRoundTripTime?: number;
        bytesSent?: number;
        bytesReceived?: number;
      };
      const local = pair.localCandidateId ? stats.get(pair.localCandidateId) : undefined;
      const remote = pair.remoteCandidateId ? stats.get(pair.remoteCandidateId) : undefined;
      const localCandidate = local as
        | (RTCStats & { candidateType?: string; protocol?: string; networkType?: string })
        | undefined;
      const remoteCandidate = remote as
        (RTCStats & { candidateType?: string; protocol?: string }) | undefined;
      const localCandidateType = localCandidate?.candidateType;

      return {
        selectedCandidatePairId: pair.id,
        localCandidateType,
        remoteCandidateType: remoteCandidate?.candidateType,
        transportProtocol: localCandidate?.protocol || remoteCandidate?.protocol,
        networkType: localCandidate?.networkType,
        usedTurnRelay: localCandidateType === 'relay' || remoteCandidate?.candidateType === 'relay',
        currentRoundTripTime: pair.currentRoundTripTime,
        bytesSent: pair.bytesSent,
        bytesReceived: pair.bytesReceived
      };
    } catch {
      return {};
    }
  }

  private unbindSocketListeners() {
    if (!this.socket?.off) return;
    for (const event of Object.values(CALL_SOCKET_EVENTS)) {
      this.socket.off(event);
    }
  }
}
