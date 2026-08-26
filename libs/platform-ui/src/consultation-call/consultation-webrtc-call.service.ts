import { Injectable, signal } from '@angular/core';
import {
  CALL_SOCKET_EVENTS,
  type CallMode,
  type CallNetworkProfile,
  type CallNetworkType,
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
const CALL_RECOVERY_KEY = 'hopehub:recoverable-call';
const CALL_RECOVERY_MAX_AGE_MS = 5 * 60 * 1000;
const DELIVERY_ACK_TIMEOUT_MS = 8_000;
const OFFER_RETRY_INTERVAL_MS = 3_000;
const CALL_DEVICE_PREFERENCES_KEY = 'hopehub:call-device-preferences';
const CALL_CONNECTIVITY_CACHE_KEY = 'hopehub:call-connectivity-preflight';
const CALL_CONNECTIVITY_CACHE_TTL_MS = 5 * 60 * 1000;
const POOR_SAMPLES_BEFORE_VIDEO_PAUSE = 3;
const GOOD_SAMPLES_BEFORE_VIDEO_RESTORE = 5;

type ConnectivityResult = { ok: boolean; relay: boolean; message: string };
type CachedConnectivityResult = {
  key: string;
  expiresAt: number;
  result: ConnectivityResult;
};

type BrowserNetworkInformation = EventTarget & {
  type?: string;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
};

function isLikelyMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const navigatorWithUaData = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (navigatorWithUaData.userAgentData?.mobile === true) return true;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export type CallNetworkQuality = 'unknown' | 'good' | 'unstable' | 'poor';
export type CallParticipant = { name: string; imageUrl?: string; role?: string };
export type CallSummary = {
  callId: string;
  consultationId: string;
  targetUserId: string;
  mode: CallMode;
  participant: CallParticipant;
  title: string;
  message: string;
  endedAt: number;
};
export type RecoverableCall = {
  callId?: string;
  consultationId: string;
  targetUserId: string;
  mode: CallMode;
  participant: CallParticipant;
  privacyRelay: boolean;
  isInitiator?: boolean;
  signalSequence?: number;
  savedAt: number;
};

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

function browserNetworkProfile(): CallNetworkProfile {
  const connection = (navigator as Navigator & { connection?: BrowserNetworkInformation })
    .connection;
  const type = connection?.type;
  const effectiveType = connection?.effectiveType;
  const normalizedType: CallNetworkType =
    type === 'wifi' ||
    type === 'cellular' ||
    type === 'ethernet' ||
    type === 'bluetooth' ||
    type === 'none' ||
    type === 'other'
      ? type
      : 'unknown';
  const normalizedEffectiveType =
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g' ||
    effectiveType === '4g'
      ? effectiveType
      : 'unknown';
  const saveData = connection?.saveData === true;
  const mobileWithoutNetworkType = normalizedType === 'unknown' && isLikelyMobileDevice();

  return {
    type: normalizedType,
    effectiveType: normalizedEffectiveType,
    ...(typeof connection?.rtt === 'number' ? { rttMs: connection.rtt } : {}),
    ...(typeof connection?.downlink === 'number' ? { downlinkMbps: connection.downlink } : {}),
    saveData,
    // iOS Safari does not expose this API. On a likely mobile device, use the
    // reliable relay rather than risk a carrier-NAT direct-call failure.
    requiresRelay:
      normalizedType === 'cellular' ||
      mobileWithoutNetworkType ||
      saveData ||
      normalizedEffectiveType === 'slow-2g' ||
      normalizedEffectiveType === '2g' ||
      normalizedEffectiveType === '3g'
  };
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
    return needsCamera
      ? 'The browser could not find a camera or microphone. Check the selected devices and retry.'
      : 'The browser could not find a microphone. Check Windows sound input and browser microphone settings, then retry.';
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
  readonly activeCallElsewhere = signal<{
    consultationId: string;
    targetUserId: string;
    callId: string;
    mode: CallMode;
    status: string;
  } | null>(null);
  readonly callUiRestoreRequest = signal(0);
  readonly selectedAudioInputId = signal('');
  readonly selectedVideoInputId = signal('');
  readonly selectedAudioOutputId = signal('');
  readonly networkQuality = signal<CallNetworkQuality>('unknown');
  readonly incomingAlertsEnabled = signal(false);
  readonly privacyRelay = signal(false);
  readonly networkProfile = signal<CallNetworkProfile>({
    type: 'unknown',
    effectiveType: 'unknown',
    saveData: false,
    requiresRelay: false
  });
  readonly connectionOnline = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly voiceFallbackSuggested = signal(false);
  readonly activeConsultationId = signal('');
  readonly activeTargetUserId = signal('');
  readonly remoteRinging = signal(false);
  readonly micEnabled = signal(true);
  readonly cameraEnabled = signal(true);
  readonly participant = signal<CallParticipant>({ name: 'Hope Hub member' });
  readonly lastCallSummary = signal<CallSummary | null>(null);
  readonly recoverableCall = signal<RecoverableCall | null>(null);
  readonly receiverUnavailable = signal(false);
  readonly answerRequested = signal(false);
  readonly localSpeaking = signal(false);
  readonly remoteSpeaking = signal(false);
  readonly lowDataMode = signal(false);
  readonly backgroundBlurEnabled = signal(false);
  readonly backgroundBlurSupported = signal(false);
  readonly deviceRecoveryMessage = signal('');
  readonly diagnosticReported = signal(false);
  readonly videoPausedForNetwork = signal(false);
  readonly remoteVideoPausedForNetwork = signal(false);
  readonly signalingInterrupted = signal(false);

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
  private deliveryAckTimeout: ReturnType<typeof setTimeout> | null = null;
  private offerRetryTimer: ReturnType<typeof setInterval> | null = null;
  private queuedAcceptIceServers: IceServerConfig[] | null = null;
  private ringtoneTimer: ReturnType<typeof setInterval> | null = null;
  private ringtoneContext: AudioContext | null = null;
  private incomingNotification: Notification | null = null;
  private ongoingCallNotification: Notification | null = null;
  private speakingMeterTimer: ReturnType<typeof setInterval> | null = null;
  private speakingMeterContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private connectedToneCallId = '';
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
  private consecutiveGoodSamples = 0;
  private cameraWasEnabledBeforeNetworkPause = false;
  private previousInboundPacketsLost = 0;
  private previousInboundPacketsReceived = 0;
  private callStartedAt = 0;
  private ringAcknowledgedAt = 0;
  private answerReceivedAt = 0;
  private firstRemoteMediaAt = 0;
  private connectedAt = 0;
  private gatheredCandidateCount = 0;
  private gatheredRelayCandidateCount = 0;
  private readonly gatheredCandidateTypes = new Set<string>();
  private manualLowDataMode = false;
  private readonly connectivityChecks = new Map<string, Promise<ConnectivityResult>>();
  private connectivityPreflightSource = 'none';
  private connectivityCheckMs = 0;
  private mediaAcquisitionMs = 0;
  private preparedStreamReused = false;
  private pendingRecoveryRestart: {
    recovery: RecoverableCall;
    iceServers: IceServerConfig[];
  } | null = null;
  private readonly callTabId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `call-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private callLockKey = '';
  private callLockHeartbeat: ReturnType<typeof setInterval> | null = null;
  private beforeUnloadBound = false;
  private ringToneUnlockBound = false;
  private readonly releaseLockBeforeUnload = () => this.releaseCallLock();
  private readonly unlockRingToneOnInteraction = () => {
    void this.primeRingTone();
    this.ringToneUnlockBound = false;
  };
  private readonly handleOnline = () => {
    this.invalidateConnectivityCache();
    this.connectionOnline.set(true);
    if (this.callContext && this.pc) {
      this.state.set('reconnecting');
      this.startReconnectTimeout();
      void this.attemptIceRestart(true);
    }
  };
  private readonly handleOffline = () => {
    this.invalidateConnectivityCache();
    this.connectionOnline.set(false);
    if (this.callContext) {
      this.state.set('reconnecting');
      this.startReconnectTimeout();
    }
  };
  private readonly handleNetworkInformationChange = () => {
    this.invalidateConnectivityCache();
    this.refreshNetworkProfile();
    if (this.callContext && this.networkProfile().requiresRelay && !this.privacyRelay()) {
      this.deviceRecoveryMessage.set(
        'Your network changed. Reconnect the call to use the more reliable connection.'
      );
    }
  };
  private readonly handlePageHide = (event: PageTransitionEvent) => {
    if (event.persisted || !this.callContext) return;
    this.emitSignal(CALL_SOCKET_EVENTS.END, {
      ...this.callContext,
      reason: 'page_closed',
      metadata: this.callMetadata()
    });
    this.persistRecoveryContext();
    this.releaseCallLock();
  };
  private readonly handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState !== 'visible') {
      if (this.hasActiveCall() && !this.incomingCall()) this.showOngoingCallNotification();
      return;
    }
    this.closeOngoingCallNotification();
    if (this.state() === 'connected') void this.acquireWakeLock();
    if (this.callContext && this.activeCallId) {
      this.emitSignal(CALL_SOCKET_EVENTS.SYNC, {
        ...this.callContext,
        mode: this.callMode()
      });
    }
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
  private readonly handleMediaDeviceChange = () => void this.recoverDisconnectedDevices();

  constructor() {
    this.restoreDevicePreferences();
    if (typeof navigator !== 'undefined') {
      this.refreshNetworkProfile();
      this.browserConnection()?.addEventListener('change', this.handleNetworkInformationChange);
      navigator.mediaDevices?.addEventListener?.('devicechange', this.handleMediaDeviceChange);
      this.registerHardwareCallControls();
    }
  }

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
      this.restoreRecoveryContext();
    }
    if (typeof window !== 'undefined' && !this.ringToneUnlockBound) {
      window.addEventListener('pointerdown', this.unlockRingToneOnInteraction, { once: true });
      this.ringToneUnlockBound = true;
    }

    socket.on('connect', () => {
      this.signalingInterrupted.set(false);
      if (this.deviceRecoveryMessage().includes('service update')) {
        this.deviceRecoveryMessage.set('');
      }
      if (!this.callContext || !this.activeCallId) return;
      this.emitSignal(CALL_SOCKET_EVENTS.SYNC, {
        ...this.callContext,
        mode: this.callMode()
      });
    });

    socket.on('disconnect', () => {
      if (!this.callContext || this.state() === 'ended') return;
      this.signalingInterrupted.set(true);
      if (
        this.pc?.connectionState === 'connected' ||
        this.pc?.iceConnectionState === 'connected' ||
        this.pc?.iceConnectionState === 'completed'
      ) {
        this.deviceRecoveryMessage.set(
          'Hope Hub is reconnecting call controls after a brief service update. Your audio and video can continue.'
        );
        return;
      }
      this.state.set('reconnecting');
      this.startReconnectTimeout();
    });

    socket.on(CALL_SOCKET_EVENTS.SERVER_DRAINING, () => {
      if (!this.callContext) return;
      this.signalingInterrupted.set(true);
      this.deviceRecoveryMessage.set(
        'Hope Hub is applying a brief service update. Keep this call open; call controls will reconnect automatically.'
      );
    });

    socket.on(CALL_SOCKET_EVENTS.STATE, (raw: unknown) => {
      const payload = raw as {
        consultationId?: string;
        targetUserId?: string;
        active?: boolean;
        callId?: string;
        mode?: CallMode;
        status?: string;
        lastAcceptedSequence?: number;
        reason?: string;
      };
      if (!this.callContext) {
        if (payload.active && payload.consultationId && payload.targetUserId && payload.callId) {
          this.activeCallElsewhere.set({
            consultationId: payload.consultationId,
            targetUserId: payload.targetUserId,
            callId: payload.callId,
            mode: payload.mode === 'video' ? 'video' : 'audio',
            status: payload.status || 'ACTIVE'
          });
        } else if (
          !payload.active &&
          payload.consultationId &&
          this.activeCallElsewhere()?.consultationId === payload.consultationId
        ) {
          this.activeCallElsewhere.set(null);
        }
        return;
      }
      if (payload.callId && payload.callId !== this.activeCallId) return;
      if (typeof payload.lastAcceptedSequence === 'number') {
        this.signalSequence = Math.max(this.signalSequence, payload.lastAcceptedSequence);
      }
      if (!payload.active) {
        if (this.state() === 'reconnecting') {
          const restart = this.pendingRecoveryRestart;
          this.pendingRecoveryRestart = null;
          this.clearRecoveryContext();
          this.cleanup(restart ? 'idle' : 'ended');
          if (restart && this.socket) {
            this.setParticipant(restart.recovery.participant);
            void this.startCall({
              socket: this.socket,
              consultationId: restart.recovery.consultationId,
              targetUserId: restart.recovery.targetUserId,
              mode: restart.recovery.mode,
              iceServers: restart.iceServers,
              privacyRelay: restart.recovery.privacyRelay
            }).catch((error) => {
              this.recoverableCall.set(restart.recovery);
              this.error.set(
                error instanceof Error ? error.message : 'Could not restore this call.'
              );
            });
          } else {
            this.error.set(callReasonMessage(payload.reason || 'call_not_active'));
          }
        } else if (this.hasActiveCall()) {
          const consultationId = this.activeConsultationId();
          const message = callReasonMessage(payload.reason || 'ended');
          if (consultationId) this.setCallSummary(consultationId, 'Call ended', message);
          this.clearRecoveryContext();
          this.cleanup('ended');
          void this.playStatusTone('ended');
        }
        return;
      }
      this.pendingRecoveryRestart = null;
      this.persistRecoveryContext();
      void this.attemptIceRestart(true);
    });

    socket.on(CALL_SOCKET_EVENTS.RING, (raw: unknown) => {
      const payload = raw as {
        fromUserId?: string;
        consultationId?: string;
        callId?: string;
        mode?: CallMode;
        fromName?: string;
        fromImageUrl?: string | null;
        fromRole?: string;
      };
      if (!payload?.fromUserId) return;
      this.activeCallElsewhere.set(null);
      if (this.activeCallId && payload.callId && payload.callId !== this.activeCallId) return;
      if (payload.consultationId) {
        this.observedCallLockKey = `${CALL_TAB_LOCK_PREFIX}${payload.consultationId}`;
        this.activeConsultationId.set(payload.consultationId);
      }
      if (payload.callId) this.activeCallId = payload.callId;
      if (payload.mode === 'audio' || payload.mode === 'video') this.callMode.set(payload.mode);
      this.setParticipant({
        name: payload.fromName || 'Hope Hub member',
        imageUrl: payload.fromImageUrl || undefined,
        role: payload.fromRole
      });
      this.activeTargetUserId.set(payload.fromUserId);
      this.incomingCall.set(true);
      if (this.state() === 'idle') this.state.set('ringing');
      void this.startIncomingAlert();
      if (payload.consultationId) {
        this.emitSignal(CALL_SOCKET_EVENTS.RING_ACK, {
          consultationId: payload.consultationId,
          targetUserId: payload.fromUserId,
          mode: payload.mode ?? this.callMode(),
          metadata: this.callMetadata()
        });
      }
    });

    socket.on(CALL_SOCKET_EVENTS.RING_ACK, (raw: unknown) => {
      const payload = raw as { consultationId?: string; fromUserId?: string; callId?: string };
      if (!this.matchesCallContext(payload)) return;
      this.clearDeliveryAckTimeout();
      this.clearOfferRetry();
      this.receiverUnavailable.set(false);
      this.remoteRinging.set(true);
      if (!this.ringAcknowledgedAt) this.ringAcknowledgedAt = Date.now();
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

    socket.on(CALL_SOCKET_EVENTS.MEDIA_STATE, (raw: unknown) => {
      const payload = raw as {
        consultationId?: string;
        fromUserId?: string;
        callId?: string;
        metadata?: Record<string, unknown>;
      };
      if (!this.matchesCallContext(payload)) return;
      this.remoteVideoPausedForNetwork.set(payload.metadata?.['videoPausedForNetwork'] === true);
    });

    socket.on(CALL_SOCKET_EVENTS.END, (raw: unknown) => void this.onRemoteCallClosed(raw));
    socket.on(CALL_SOCKET_EVENTS.REJECT, (raw: unknown) => void this.onRemoteCallClosed(raw));
  }

  setMediaAccessHandler(handler: (mode: CallMode) => Promise<MediaAccessResult>) {
    this.ensureMediaAccess = handler;
  }

  syncCallAvailability(socket: CallSignalingSocket, consultationId: string, targetUserId: string) {
    if (!consultationId || !targetUserId || this.hasActiveCall()) return;
    this.bindSocket(socket);
    socket.emit(CALL_SOCKET_EVENTS.SYNC, {
      consultationId,
      targetUserId,
      metadata: { discovery: true }
    });
  }

  dismissActiveCallElsewhere() {
    this.activeCallElsewhere.set(null);
  }

  requestCallUiRestore() {
    this.callUiRestoreRequest.update((value) => value + 1);
  }

  refreshNetworkProfile() {
    if (typeof navigator === 'undefined') return this.networkProfile();
    const profile = browserNetworkProfile();
    this.networkProfile.set(profile);
    return profile;
  }

  private browserConnection() {
    if (typeof navigator === 'undefined') return undefined;
    return (navigator as Navigator & { connection?: BrowserNetworkInformation }).connection;
  }

  private async resolveRelayPolicy(
    _iceServers: IceServerConfig[],
    requestedRelay: boolean,
    mode: CallMode
  ) {
    const profile = this.refreshNetworkProfile();
    const relayRequired = requestedRelay || profile.requiresRelay;
    if (!relayRequired) return false;

    if (mode === 'video' && profile.requiresRelay) {
      this.lowDataMode.set(true);
      this.manualLowDataMode = true;
    }
    return true;
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

  async acquireMediaStream(mode: CallMode): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('MEDIA_NOT_SUPPORTED');
    }
    const startedAt = performance.now();
    try {
      return await navigator.mediaDevices.getUserMedia(this.mediaConstraints(mode));
    } finally {
      this.mediaAcquisitionMs = Math.max(0, Math.round(performance.now() - startedAt));
    }
  }

  async resetMediaDeviceSelection() {
    this.selectedAudioInputId.set('');
    this.selectedVideoInputId.set('');
    this.selectedAudioOutputId.set('');
    this.persistDevicePreferences();
    await this.refreshMediaDevices();
  }

  async selectAudioInput(deviceId: string) {
    const previousId = this.selectedAudioInputId();
    this.selectedAudioInputId.set(deviceId);
    if (!this.localStream()) {
      this.persistDevicePreferences();
      return;
    }
    try {
      await this.replaceLocalTrack('audio', deviceId);
      this.persistDevicePreferences();
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
    if (!this.localStream() || this.callMode() !== 'video') {
      this.persistDevicePreferences();
      return;
    }
    try {
      await this.replaceLocalTrack('video', deviceId);
      this.persistDevicePreferences();
    } catch (error) {
      this.selectedVideoInputId.set(previousId);
      const message = mediaAccessErrorMessage(error, 'video');
      this.error.set(message);
      throw new Error(message);
    }
  }

  async cycleVideoInput() {
    await this.refreshMediaDevices();
    const cameras = this.videoInputs();
    if (cameras.length < 2) return false;

    const activeTrackId = this.localStream()?.getVideoTracks()[0]?.getSettings().deviceId || '';
    const currentId = this.selectedVideoInputId() || activeTrackId;
    const currentIndex = cameras.findIndex((device) => device.deviceId === currentId);
    const nextCamera = cameras[(currentIndex + 1 + cameras.length) % cameras.length];
    await this.selectVideoInput(nextCamera.deviceId);
    return true;
  }

  async setBackgroundBlur(enabled: boolean) {
    const track = this.localStream()?.getVideoTracks()[0];
    if (!track) return false;
    const supported = Boolean(
      typeof navigator !== 'undefined' &&
      (navigator.mediaDevices?.getSupportedConstraints() as Record<string, boolean> | undefined)?.[
        'backgroundBlur'
      ]
    );
    this.backgroundBlurSupported.set(supported);
    if (!supported) return false;
    try {
      await track.applyConstraints({
        advanced: [{ backgroundBlur: enabled }]
      } as MediaTrackConstraints);
      this.backgroundBlurEnabled.set(enabled);
      return true;
    } catch {
      return false;
    }
  }

  async setLowDataMode(enabled: boolean) {
    this.manualLowDataMode = enabled;
    this.lowDataMode.set(enabled);
    if (this.callMode() === 'video') await this.applyVideoProfile(enabled ? 'low' : 'balanced');
  }

  selectAudioOutput(deviceId: string) {
    this.selectedAudioOutputId.set(deviceId === 'default' ? '' : deviceId);
    this.persistDevicePreferences();
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
    preparedStream?: MediaStream;
  }) {
    if (this.activeCallElsewhere()) {
      const message = 'This session already has a call active on another tab or device.';
      this.error.set(message);
      throw new Error(message);
    }
    if (this.hasActiveCall()) {
      const message = 'Your current call is already open. Use the active call controls.';
      this.error.set(message);
      throw new Error(message);
    }
    const privacyRelay = await this.resolveRelayPolicy(
      params.iceServers ?? DEFAULT_STUN,
      params.privacyRelay === true,
      params.mode
    );
    if (!this.acquireCallLock(params.consultationId)) {
      const message = 'This call is already open in another browser tab.';
      this.error.set(message);
      this.state.set('error');
      throw new Error(message);
    }
    this.bindSocket(params.socket);
    this.callContext = { consultationId: params.consultationId, targetUserId: params.targetUserId };
    this.activeTargetUserId.set(params.targetUserId);
    this.incomingCall.set(false);
    this.stopIncomingAlert();
    this.isInitiator = true;
    this.activeCallId = this.newCallId();
    this.callStartedAt = Date.now();
    this.connectedToneCallId = '';
    this.signalSequence = 0;
    this.iceRestartAttempts = 0;
    this.totalReconnectCount = 0;
    this.privacyRelay.set(privacyRelay);
    this.voiceFallbackSuggested.set(false);
    this.remoteRinging.set(false);
    this.micEnabled.set(true);
    this.cameraEnabled.set(params.mode === 'video');
    this.callMode.set(params.mode);
    this.error.set('');
    this.lastCallSummary.set(null);
    this.recoverableCall.set(null);
    this.receiverUnavailable.set(false);
    this.activeCallElsewhere.set(null);

    try {
      await this.ensurePeer(
        params.mode,
        params.iceServers ?? DEFAULT_STUN,
        privacyRelay,
        params.preparedStream
      );
      this.activeConsultationId.set(params.consultationId);
      this.persistRecoveryContext();
      this.makingOffer = true;
      await this.pc!.setLocalDescription();
      const offer = this.pc!.localDescription!;
      this.makingOffer = false;

      this.state.set('ringing');
      void this.startOutgoingAlert();
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
      this.startOfferRetry(offer, params);
      this.startDeliveryAckTimeout();
      this.startAnswerTimeout();
    } catch (error) {
      params.preparedStream?.getTracks().forEach((track) => track.stop());
      this.makingOffer = false;
      const message =
        this.error() || (error instanceof Error ? error.message : 'Could not start call.');
      this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
        consultationId: params.consultationId,
        targetUserId: params.targetUserId,
        reason: 'media_initialization_failed',
        metadata: {
          ...this.callMetadata(),
          diagnosticReason: 'media_initialization_failed',
          errorName:
            error && typeof error === 'object' && 'name' in error ? String(error.name) : 'Error'
        }
      });
      this.cleanup('error');
      this.error.set(message);
      throw error;
    }
  }

  async acceptIncoming(iceServers: IceServerConfig[] = DEFAULT_STUN) {
    const offer = this.pendingOffer();
    if (!offer) {
      this.answerRequested.set(true);
      this.queuedAcceptIceServers = iceServers;
      return;
    }
    if (!this.socket) return;
    this.answerRequested.set(true);
    let privacyRelay: boolean;
    try {
      privacyRelay = await this.resolveRelayPolicy(iceServers, this.privacyRelay(), offer.mode);
    } catch {
      this.answerRequested.set(false);
      return;
    }
    if (!this.acquireCallLock(offer.consultationId)) {
      this.answerRequested.set(false);
      this.error.set('This call is already open in another browser tab.');
      this.state.set('error');
      return;
    }

    this.activeCallId = offer.callId;
    this.callStartedAt = Date.now();
    this.connectedToneCallId = '';
    // Keep the sequence established by the incoming RING/OFFER acknowledgements.
    // Resetting it here causes ANSWER/ICE to reuse an earlier sequence number, so
    // the API correctly rejects the fresh signal as stale and the call disconnects.
    this.callContext = {
      consultationId: offer.consultationId,
      targetUserId: offer.fromUserId
    };
    this.activeConsultationId.set(offer.consultationId);
    this.activeTargetUserId.set(offer.fromUserId);
    this.callMode.set(offer.mode);
    this.privacyRelay.set(privacyRelay);
    this.error.set('');
    this.incomingCall.set(false);
    this.state.set('connecting');
    this.stopIncomingAlert();
    this.isInitiator = false;
    this.iceRestartAttempts = 0;
    this.totalReconnectCount = 0;
    this.remoteRinging.set(false);
    this.micEnabled.set(true);
    this.cameraEnabled.set(offer.mode === 'video');
    this.persistRecoveryContext();

    try {
      await this.ensurePeer(offer.mode, iceServers, privacyRelay);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      await this.flushIceQueue();
      this.emitSignal(CALL_SOCKET_EVENTS.ANSWER, {
        consultationId: offer.consultationId,
        targetUserId: offer.fromUserId,
        sdp: answer,
        metadata: this.callMetadata()
      });
      this.pendingOffer.set(null);
      this.answerRequested.set(false);
      this.queuedAcceptIceServers = null;
      this.startMediaTimeout();
    } catch (err) {
      this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
        consultationId: offer.consultationId,
        targetUserId: offer.fromUserId,
        reason: 'incoming_media_initialization_failed',
        metadata: {
          ...this.callMetadata(),
          diagnosticReason: 'incoming_media_initialization_failed',
          errorName: err && typeof err === 'object' && 'name' in err ? String(err.name) : 'Error'
        }
      });
      this.releaseCallLock();
      this.resetIncomingAcceptance(offer);
      this.error.set(
        err instanceof Error ? err.message : 'Could not join call. Check permission and try again.'
      );
      this.state.set('error');
    }
  }

  rejectCall(params: { consultationId: string; targetUserId: string; reason?: string }) {
    this.emitSignal(CALL_SOCKET_EVENTS.REJECT, {
      ...params,
      reason: params.reason || 'rejected',
      metadata: this.callMetadata()
    });
    this.setCallSummary(params.consultationId, 'Call declined', 'You declined this call.');
    this.clearRecoveryContext();
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.answerRequested.set(false);
    this.queuedAcceptIceServers = null;
    this.cleanup('ended');
    void this.playStatusTone('ended');
  }

  async endCall(params: { consultationId: string; targetUserId: string; reason?: string }) {
    this.emitSignal(CALL_SOCKET_EVENTS.END, {
      ...params,
      reason: params.reason || 'ended_by_user',
      metadata: await this.callMetadataWithStats()
    });
    const switching = Boolean(params.reason?.startsWith('switch_to_'));
    const silentClose = ['signed_out', 'page_closed'].includes(params.reason || '');
    if (!switching && !silentClose) {
      this.setCallSummary(params.consultationId, 'Call ended', 'Your private call has ended.');
    }
    if (!switching) this.clearRecoveryContext();
    this.cleanup('ended');
    if (silentClose) this.lastCallSummary.set(null);
    if (!switching) void this.playStatusTone('ended');
  }

  setParticipant(participant: CallParticipant) {
    this.participant.set({
      name: participant.name.trim() || 'Hope Hub member',
      imageUrl: participant.imageUrl || undefined,
      role: participant.role || undefined
    });
  }

  dismissCallSummary() {
    this.lastCallSummary.set(null);
    this.diagnosticReported.set(false);
    if (this.state() === 'ended') this.state.set('idle');
  }

  async callBack(iceServers: IceServerConfig[] = DEFAULT_STUN) {
    const previous = this.lastCallSummary();
    if (!previous || !this.socket) return;
    this.setParticipant(previous.participant);
    this.lastCallSummary.set(null);
    await this.startCall({
      socket: this.socket,
      consultationId: previous.consultationId,
      targetUserId: previous.targetUserId,
      mode: previous.mode,
      iceServers,
      privacyRelay: this.privacyRelay()
    });
  }

  async reportLastCallProblem(reason = 'connection_or_device_problem') {
    const previous = this.lastCallSummary();
    if (!previous || !this.socket) return false;
    this.activeCallId = previous.callId;
    this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
      consultationId: previous.consultationId,
      targetUserId: previous.targetUserId,
      reason,
      metadata: {
        ...(await this.callMetadataWithStats()),
        userReportedIssue: true,
        diagnosticReason: reason
      }
    });
    this.diagnosticReported.set(true);
    return true;
  }

  async reportActiveCallProblem(
    reason: string,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    if (!this.socket || !this.callContext || !this.activeCallId) return false;
    this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
      ...this.callContext,
      reason,
      metadata: {
        ...this.callMetadata(),
        ...metadata,
        diagnosticReason: reason
      }
    });
    return true;
  }

  async resumeRecoverableCall(iceServers: IceServerConfig[] = DEFAULT_STUN) {
    const recovery = this.recoverableCall();
    if (!recovery || !this.socket) return;
    this.setParticipant(recovery.participant);
    this.recoverableCall.set(null);
    if (recovery.callId) {
      if (!this.acquireCallLock(recovery.consultationId)) {
        this.recoverableCall.set(recovery);
        throw new Error('This call is already open in another browser tab.');
      }
      this.callContext = {
        consultationId: recovery.consultationId,
        targetUserId: recovery.targetUserId
      };
      this.activeCallId = recovery.callId;
      this.signalSequence = Math.max(0, Number(recovery.signalSequence || 0));
      this.isInitiator = recovery.isInitiator === true;
      this.activeConsultationId.set(recovery.consultationId);
      this.activeTargetUserId.set(recovery.targetUserId);
      this.callMode.set(recovery.mode);
      this.privacyRelay.set(recovery.privacyRelay);
      this.callStartedAt = recovery.savedAt;
      this.pendingRecoveryRestart = { recovery, iceServers };
      this.error.set('');
      try {
        await this.ensurePeer(recovery.mode, iceServers, recovery.privacyRelay);
        this.state.set('reconnecting');
        this.startReconnectTimeout();
        this.persistRecoveryContext();
        this.emitSignal(CALL_SOCKET_EVENTS.SYNC, {
          consultationId: recovery.consultationId,
          targetUserId: recovery.targetUserId,
          mode: recovery.mode
        });
        return;
      } catch (error) {
        this.cleanup('error');
        this.recoverableCall.set(recovery);
        throw error;
      }
    }
    try {
      await this.startCall({
        socket: this.socket,
        consultationId: recovery.consultationId,
        targetUserId: recovery.targetUserId,
        mode: recovery.mode,
        iceServers,
        privacyRelay: recovery.privacyRelay
      });
    } catch (error) {
      this.recoverableCall.set(recovery);
      throw error;
    }
  }

  dismissRecoverableCall() {
    this.clearRecoveryContext();
  }

  setMicEnabled(enabled: boolean) {
    this.micEnabled.set(enabled);
    this.localStream()
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  setCameraEnabled(enabled: boolean) {
    if (enabled && this.videoPausedForNetwork()) {
      this.cameraWasEnabledBeforeNetworkPause = true;
      this.deviceRecoveryMessage.set(
        'Video will return automatically when the network is stable. Voice remains connected.'
      );
      return;
    }
    if (!enabled && this.videoPausedForNetwork()) this.cameraWasEnabledBeforeNetworkPause = false;
    this.cameraEnabled.set(enabled);
    this.localStream()
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });
  }

  cleanup(state: CallState = 'idle') {
    this.clearCallTimers();
    this.stopIncomingAlert();
    this.closeOngoingCallNotification();
    this.clearMediaSessionCallState();
    this.stopNetworkSampling();
    this.stopSpeakingMeter();
    this.stopCallHeartbeat();
    this.clearDeliveryAckTimeout();
    this.clearOfferRetry();
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
    this.activeConsultationId.set('');
    this.activeTargetUserId.set('');
    this.remoteRinging.set(false);
    this.receiverUnavailable.set(false);
    this.pendingOffer.set(null);
    this.incomingCall.set(false);
    this.answerRequested.set(false);
    this.queuedAcceptIceServers = null;
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
    this.consecutiveGoodSamples = 0;
    this.cameraWasEnabledBeforeNetworkPause = false;
    this.previousInboundPacketsLost = 0;
    this.previousInboundPacketsReceived = 0;
    this.callStartedAt = 0;
    this.ringAcknowledgedAt = 0;
    this.answerReceivedAt = 0;
    this.firstRemoteMediaAt = 0;
    this.connectedAt = 0;
    this.gatheredCandidateCount = 0;
    this.gatheredRelayCandidateCount = 0;
    this.gatheredCandidateTypes.clear();
    this.pendingRecoveryRestart = null;
    this.networkQuality.set('unknown');
    this.voiceFallbackSuggested.set(false);
    this.lowDataMode.set(false);
    this.manualLowDataMode = false;
    this.videoPausedForNetwork.set(false);
    this.remoteVideoPausedForNetwork.set(false);
    this.signalingInterrupted.set(false);
    this.backgroundBlurEnabled.set(false);
    this.deviceRecoveryMessage.set('');
    this.micEnabled.set(true);
    this.cameraEnabled.set(true);
    this.state.set(state);
    this.error.set('');
  }

  hasActiveCall() {
    return ['ringing', 'connecting', 'connected', 'reconnecting'].includes(this.state());
  }

  async endCurrentCall(reason = 'ended_by_user') {
    const consultationId = this.activeConsultationId();
    const targetUserId = this.activeTargetUserId();
    if (!consultationId || !targetUserId) return;
    await this.endCall({ consultationId, targetUserId, reason });
  }

  async switchCurrentCallMode(mode: CallMode, _iceServers: IceServerConfig[] = DEFAULT_STUN) {
    if (!this.socket || !this.callContext || !this.pc || this.callMode() === mode) return;
    if (!this.hasActiveCall()) throw new Error('The call is no longer active.');
    if (this.pc.signalingState !== 'stable' || this.makingOffer) {
      throw new Error('The call is still updating. Try again in a moment.');
    }

    const previousMode = this.callMode();
    this.error.set('');
    try {
      if (mode === 'video') {
        await this.addLocalVideoTrack();
        await this.applyVideoProfile('balanced');
      } else {
        await this.removeLocalVideoTrack();
      }

      this.callMode.set(mode);
      this.cameraEnabled.set(mode === 'video');
      this.persistRecoveryContext();
      this.makingOffer = true;
      await this.pc.setLocalDescription(await this.pc.createOffer());
      const offer = this.pc.localDescription;
      if (!offer) throw new Error('Could not update this call.');
      this.emitSignal(CALL_SOCKET_EVENTS.OFFER, {
        ...this.callContext,
        mode,
        sdp: offer,
        metadata: {
          ...this.callMetadata(),
          modeSwitch: true,
          previousMode,
          privacyRelay: this.privacyRelay()
        }
      });
    } catch (error) {
      // Adding video must never tear down a healthy voice call. Keep the existing audio session
      // alive and let the user retry camera access without another ring/hang-up cycle.
      this.callMode.set(previousMode);
      if (previousMode === 'audio') await this.removeLocalVideoTrack();
      const message =
        error instanceof Error
          ? error.message
          : 'Could not change the call mode. Voice is still connected.';
      this.error.set(previousMode === 'audio' ? `${message} Voice is still connected.` : message);
      throw error;
    } finally {
      this.makingOffer = false;
    }
  }

  private async onRemoteOffer(raw: unknown) {
    const payload = raw as {
      fromUserId?: string;
      consultationId?: string;
      mode?: CallMode;
      sdp?: RTCSessionDescriptionInit;
      metadata?: Record<string, unknown>;
      callId?: string;
      fromName?: string;
      fromImageUrl?: string | null;
      fromRole?: string;
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
        const requestedMode: CallMode =
          payload.mode === 'audio'
            ? 'audio'
            : payload.mode === 'video' || sdpHasVideo(payload.sdp.sdp)
              ? 'video'
              : 'audio';
        if (payload.metadata?.['modeSwitch'] === true) {
          if (requestedMode === 'video' && !this.localStream()?.getVideoTracks().length) {
            try {
              await this.addLocalVideoTrack();
              await this.applyVideoProfile('balanced');
            } catch {
              // Receiving the other person's video does not require our camera. Continue the
              // voice call and answer recv-only when this device cannot open its camera.
              this.cameraEnabled.set(false);
              this.deviceRecoveryMessage.set(
                'Video is on. Your camera stayed off because it is unavailable or permission was not granted.'
              );
            }
          } else if (requestedMode === 'audio') {
            await this.removeLocalVideoTrack();
          }
          this.callMode.set(requestedMode);
        }
        await this.pc.setLocalDescription();
        const answer = this.pc.localDescription!;
        await this.flushIceQueue();
        this.emitSignal(CALL_SOCKET_EVENTS.ANSWER, {
          consultationId: payload.consultationId,
          targetUserId: payload.fromUserId,
          mode: this.callMode(),
          sdp: answer,
          metadata: {
            iceRestart: payload.metadata?.['iceRestart'] === true,
            modeSwitch: payload.metadata?.['modeSwitch'] === true
          }
        });
      } catch {
        this.startReconnectTimeout();
      }
      return;
    }

    const mode: CallMode =
      payload.mode === 'video' ? 'video' : sdpHasVideo(payload.sdp.sdp) ? 'video' : 'audio';
    this.activeCallId = payload.callId;
    if (payload.fromName) {
      this.setParticipant({
        name: payload.fromName,
        imageUrl: payload.fromImageUrl || undefined,
        role: payload.fromRole
      });
    }
    this.privacyRelay.set(payload.metadata?.['privacyRelay'] === true);
    this.callMode.set(mode);
    this.pendingOffer.set({
      callId: payload.callId,
      fromUserId: payload.fromUserId,
      consultationId: payload.consultationId,
      sdp: payload.sdp,
      mode
    });
    this.activeConsultationId.set(payload.consultationId);
    this.incomingCall.set(true);
    this.state.set('ringing');
    this.emitSignal(CALL_SOCKET_EVENTS.RING_ACK, {
      consultationId: payload.consultationId,
      targetUserId: payload.fromUserId,
      mode,
      metadata: this.callMetadata()
    });
    const queuedIceServers = this.queuedAcceptIceServers;
    if (queuedIceServers) {
      this.queuedAcceptIceServers = null;
      void this.acceptIncoming(queuedIceServers);
    } else {
      void this.startIncomingAlert();
    }
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
    this.clearDeliveryAckTimeout();
    this.clearOfferRetry();
    this.receiverUnavailable.set(false);
    this.clearAnswerTimeout();
    if (!this.answerReceivedAt) this.answerReceivedAt = Date.now();
    this.isSettingRemoteAnswerPending = true;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      this.stopIncomingAlert();
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
      if (!this.ignoreOffer) this.error.set('Your connection changed. Reconnecting…');
    }
  }

  private async onRemoteCallClosed(raw: unknown) {
    const payload = raw as {
      consultationId?: string;
      fromUserId?: string;
      callId?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    };
    if (!this.matchesCallContext(payload)) return;
    if (payload.metadata?.['modeSwitch'] === true && this.pc) {
      const previousMode: CallMode =
        payload.metadata?.['previousMode'] === 'video' ? 'video' : 'audio';
      if (this.pc.signalingState === 'have-local-offer') {
        await this.pc.setLocalDescription({ type: 'rollback' }).catch(() => undefined);
      }
      if (previousMode === 'audio') {
        await this.removeLocalVideoTrack();
      } else if (!this.localStream()?.getVideoTracks().length) {
        await this.addLocalVideoTrack().catch(() => undefined);
      }
      this.callMode.set(previousMode);
      this.cameraEnabled.set(previousMode === 'video');
      this.error.set(
        previousMode === 'audio'
          ? 'Video could not be enabled. Your voice call is still connected.'
          : 'Voice-only mode could not be enabled. Your video call is still connected.'
      );
      return;
    }
    const message = callReasonMessage(payload?.reason);
    const switchedMode = Boolean(payload?.reason?.startsWith('switch_to_'));
    const consultationId = payload.consultationId || this.activeConsultationId();
    if (!switchedMode && consultationId) {
      const title = payload.reason === 'rejected' ? 'Call declined' : 'Call ended';
      this.setCallSummary(consultationId, title, message);
    }
    if (!switchedMode) this.clearRecoveryContext();
    this.cleanup('ended');
    if (!switchedMode) void this.playStatusTone('ended');
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
    privacyRelay = false,
    preparedStream?: MediaStream
  ) {
    if (this.pc) return;

    const preparedStreamReady = this.mediaStreamSupportsMode(preparedStream, mode);
    this.preparedStreamReused = preparedStreamReady;
    if (!preparedStreamReady && this.ensureMediaAccess) {
      const access = await this.ensureMediaAccess(mode);
      if (!access.granted) {
        this.error.set(access.message ?? 'Camera or microphone permission required.');
        this.state.set('error');
        throw new Error(access.message ?? 'Media permission denied');
      }
    }

    let stream: MediaStream;
    try {
      if (preparedStream && !preparedStreamReady) {
        preparedStream.getTracks().forEach((track) => track.stop());
      }
      stream = preparedStreamReady ? preparedStream! : await this.acquireMediaStream(mode);
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
      if (track.kind === 'audio' && 'contentHint' in track) track.contentHint = 'speech';
      const sender = this.pc.addTrack(track, stream);
      this.configureCodecPreferences(sender, track.kind);
    }
    if (mode === 'video') await this.applyVideoProfile('balanced');

    this.pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (remote) {
        const markFirstMedia = () => {
          if (!this.firstRemoteMediaAt) this.firstRemoteMediaAt = Date.now();
        };
        if (event.track.muted)
          event.track.addEventListener('unmute', markFirstMedia, { once: true });
        else markFirstMedia();
        this.remoteStream.set(remote);
        this.stopSpeakingMeter();
        this.startSpeakingMeter();
      }
    };

    this.pc.onicecandidate = (event) => {
      if (!event.candidate || !this.socket || !this.callContext) return;
      const candidateType = event.candidate.type || 'unknown';
      this.gatheredCandidateCount += 1;
      this.gatheredCandidateTypes.add(candidateType);
      if (candidateType === 'relay') this.gatheredRelayCandidateCount += 1;
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

  private mediaStreamSupportsMode(stream: MediaStream | undefined, mode: CallMode): boolean {
    if (!stream) return false;
    const hasLiveAudio = stream.getAudioTracks().some((track) => track.readyState === 'live');
    const hasLiveVideo = stream.getVideoTracks().some((track) => track.readyState === 'live');
    return hasLiveAudio && (mode === 'audio' || hasLiveVideo);
  }

  private mediaConstraints(mode: CallMode): MediaStreamConstraints {
    const videoDeviceId = this.selectedVideoInputId();
    return {
      audio: this.audioConstraints(),
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

  private audioConstraints(deviceId = this.selectedAudioInputId()): MediaTrackConstraints {
    return {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      // Speech calls should remain mono. This gives mobile echo cancellers one clean channel
      // and prevents stereo capture from doubling room/background noise.
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48_000 },
      sampleSize: { ideal: 16 },
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true }
    };
  }

  private keepAvailableDeviceSelection(
    selected: { (): string; set(value: string): void },
    devices: MediaDeviceInfo[]
  ) {
    const selectedId = selected();
    if (selectedId && !devices.some((device) => device.deviceId === selectedId)) {
      selected.set('');
      this.persistDevicePreferences();
    }
  }

  private restoreDevicePreferences() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem(CALL_DEVICE_PREFERENCES_KEY) || '{}') as {
        audioInputId?: unknown;
        videoInputId?: unknown;
        audioOutputId?: unknown;
      };
      if (typeof saved.audioInputId === 'string') this.selectedAudioInputId.set(saved.audioInputId);
      if (typeof saved.videoInputId === 'string') this.selectedVideoInputId.set(saved.videoInputId);
      if (typeof saved.audioOutputId === 'string')
        this.selectedAudioOutputId.set(
          saved.audioOutputId === 'default' ? '' : saved.audioOutputId
        );
    } catch {
      localStorage.removeItem(CALL_DEVICE_PREFERENCES_KEY);
    }
  }

  private persistDevicePreferences() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        CALL_DEVICE_PREFERENCES_KEY,
        JSON.stringify({
          audioInputId: this.selectedAudioInputId(),
          videoInputId: this.selectedVideoInputId(),
          audioOutputId: this.selectedAudioOutputId()
        })
      );
    } catch {
      // Device preferences are optional when browser storage is unavailable.
    }
  }

  private async replaceLocalTrack(kind: 'audio' | 'video', deviceId: string) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('MEDIA_NOT_SUPPORTED');
    }

    const replacementStream = await navigator.mediaDevices.getUserMedia({
      // Keep the same speech-processing profile when changing microphones mid-call. Using
      // only a deviceId here caused some mobile browsers to drop echo/noise processing.
      audio: kind === 'audio' ? this.audioConstraints(deviceId) : false,
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
    if (kind === 'audio' && 'contentHint' in replacementTrack) {
      replacementTrack.contentHint = 'speech';
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

  private async addLocalVideoTrack() {
    const pc = this.pc;
    const currentStream = this.localStream();
    if (!pc || !currentStream) throw new Error('The voice call is not ready yet.');
    const currentTrack = currentStream
      .getVideoTracks()
      .find((track) => track.readyState === 'live');
    if (currentTrack) {
      currentTrack.enabled = true;
      this.cameraEnabled.set(true);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Video calling is not supported on this device.');
    }

    let videoStream: MediaStream;
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: this.mediaConstraints('video').video
      });
    } catch (error) {
      throw new Error(mediaAccessErrorMessage(error, 'video'));
    }
    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) {
      videoStream.getTracks().forEach((track) => track.stop());
      throw new Error('No camera is available on this device.');
    }

    try {
      const reusableSender = pc
        .getTransceivers()
        .find(
          (transceiver) => transceiver.receiver.track.kind === 'video' && !transceiver.sender.track
        )?.sender;
      if (reusableSender) {
        await reusableSender.replaceTrack(videoTrack);
        this.configureCodecPreferences(reusableSender, 'video');
      } else {
        const sender = pc.addTrack(videoTrack, currentStream);
        this.configureCodecPreferences(sender, 'video');
      }
      this.localStream.set(new MediaStream([...currentStream.getAudioTracks(), videoTrack]));
      this.cameraEnabled.set(true);
      await this.refreshMediaDevices();
    } catch (error) {
      videoTrack.stop();
      throw error;
    }
  }

  private async removeLocalVideoTrack() {
    const currentStream = this.localStream();
    if (!currentStream) return;
    const videoSenders =
      this.pc?.getSenders().filter((sender) => sender.track?.kind === 'video') ?? [];
    for (const sender of videoSenders) {
      await sender.replaceTrack(null).catch(() => undefined);
    }
    currentStream.getVideoTracks().forEach((track) => track.stop());
    this.localStream.set(new MediaStream(currentStream.getAudioTracks()));
    this.cameraEnabled.set(false);
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
    const previousState = this.state();
    if (connectionState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      this.clearMediaTimeout();
      this.clearReconnectTimeout();
      this.state.set('connected');
      if (!this.connectedAt) this.connectedAt = Date.now();
      this.stopIncomingAlert();
      if (this.activeCallId && this.connectedToneCallId !== this.activeCallId) {
        this.connectedToneCallId = this.activeCallId;
        void this.playStatusTone('connected');
        if (this.callContext) {
          this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
            ...this.callContext,
            reason: 'peer_connected',
            metadata: { ...this.callMetadata(), diagnosticReason: 'peer_connected' }
          });
        }
      }
      this.iceRestartAttempts = 0;
      this.iceRestartInProgress = false;
      this.clearIceRestartTimer();
      this.startNetworkSampling();
      this.startSpeakingMeter();
      this.startCallHeartbeat();
      void this.acquireWakeLock();
      this.updateMediaSessionCallState();
      if (typeof document !== 'undefined' && document.hidden) {
        this.showOngoingCallNotification();
      }
      return;
    }

    if (connectionState === 'failed' || iceState === 'failed') {
      if (previousState !== 'reconnecting' && this.callContext) {
        this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
          ...this.callContext,
          reason: 'peer_connection_failed',
          metadata: { ...this.callMetadata(), diagnosticReason: 'peer_connection_failed' }
        });
      }
      this.state.set('reconnecting');
      this.startReconnectTimeout();
      void this.attemptIceRestart();
      return;
    }

    if (connectionState === 'disconnected' || iceState === 'disconnected') {
      if (previousState === 'connected' && this.callContext) {
        this.emitSignal(CALL_SOCKET_EVENTS.DIAGNOSTIC, {
          ...this.callContext,
          reason: 'peer_disconnected',
          metadata: { ...this.callMetadata(), diagnosticReason: 'peer_disconnected' }
        });
      }
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
        if (
          report.type === 'candidate-pair' &&
          report.state === 'succeeded' &&
          (report.selected === true || report.nominated === true)
        ) {
          roundTripTime = Math.max(roundTripTime, Number(report.currentRoundTripTime || 0));
        }
      });

      const lostDelta = Math.max(0, packetsLost - this.previousInboundPacketsLost);
      const receivedDelta = Math.max(0, packetsReceived - this.previousInboundPacketsReceived);
      this.previousInboundPacketsLost = packetsLost;
      this.previousInboundPacketsReceived = packetsReceived;
      const intervalPackets = lostDelta + receivedDelta;
      const lossPercent = intervalPackets > 0 ? (lostDelta / intervalPackets) * 100 : 0;
      this.latestNetworkMetrics = {
        packetLossPercent: Math.round(lossPercent * 100) / 100,
        maxJitterMs: Math.round(jitter * 1_000),
        averageRttMs: Math.round(roundTripTime * 1_000)
      };
      if (lossPercent >= 8 || jitter >= 0.08 || roundTripTime >= 0.6) {
        this.networkQuality.set('poor');
        this.consecutivePoorSamples += 1;
        this.consecutiveGoodSamples = 0;
        if (this.callMode() === 'video') {
          this.lowDataMode.set(true);
          void this.applyVideoProfile('low');
          if (this.consecutivePoorSamples >= POOR_SAMPLES_BEFORE_VIDEO_PAUSE) {
            this.voiceFallbackSuggested.set(true);
            void this.pauseVideoForNetwork();
          }
        }
      } else if (lossPercent >= 3 || jitter >= 0.03 || roundTripTime >= 0.25) {
        this.networkQuality.set('unstable');
        this.consecutivePoorSamples = 0;
        this.consecutiveGoodSamples = 0;
        if (this.callMode() === 'video') {
          this.lowDataMode.set(true);
          void this.applyVideoProfile('low');
        }
      } else {
        this.networkQuality.set('good');
        this.consecutivePoorSamples = 0;
        this.consecutiveGoodSamples += 1;
        this.voiceFallbackSuggested.set(false);
        this.lowDataMode.set(this.manualLowDataMode);
        if (this.callMode() === 'video')
          void this.applyVideoProfile(this.manualLowDataMode ? 'low' : 'balanced');
        if (
          this.videoPausedForNetwork() &&
          this.consecutiveGoodSamples >= GOOD_SAMPLES_BEFORE_VIDEO_RESTORE
        ) {
          void this.restoreVideoAfterNetworkRecovery();
        }
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
      (
        parameters as RTCRtpSendParameters & { degradationPreference?: string }
      ).degradationPreference = 'maintain-framerate';
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

  private configureCodecPreferences(sender: RTCRtpSender, kind: string) {
    const transceiver = this.pc?.getTransceivers?.().find((item) => item.sender === sender);
    if (
      !transceiver?.setCodecPreferences ||
      typeof RTCRtpSender === 'undefined' ||
      !RTCRtpSender.getCapabilities
    )
      return;
    const capabilities = RTCRtpSender.getCapabilities(kind);
    if (!capabilities?.codecs.length) return;
    const preferredMimeTypes =
      kind === 'audio' ? ['audio/opus'] : ['video/VP8', 'video/H264', 'video/VP9', 'video/AV1'];
    const priority = (mimeType: string) => {
      const index = preferredMimeTypes.indexOf(mimeType);
      return index === -1 ? preferredMimeTypes.length : index;
    };
    try {
      transceiver.setCodecPreferences(
        [...capabilities.codecs].sort((a, b) => priority(a.mimeType) - priority(b.mimeType))
      );
    } catch {
      // The browser's default codec order remains a safe fallback.
    }
  }

  private async setVideoEncodingActive(active: boolean) {
    const sender = this.pc?.getSenders().find((item) => item.track?.kind === 'video');
    if (!sender) return;
    const parameters = sender.getParameters();
    parameters.encodings ??= [{}];
    parameters.encodings = parameters.encodings.map((encoding) => ({ ...encoding, active }));
    await sender.setParameters(parameters);
  }

  private async pauseVideoForNetwork() {
    if (this.videoPausedForNetwork() || this.callMode() !== 'video') return;
    this.cameraWasEnabledBeforeNetworkPause = this.cameraEnabled();
    try {
      await this.setVideoEncodingActive(false);
      this.localStream()
        ?.getVideoTracks()
        .forEach((track) => (track.enabled = false));
      this.cameraEnabled.set(false);
      this.videoPausedForNetwork.set(true);
      this.emitSignal(CALL_SOCKET_EVENTS.MEDIA_STATE, {
        ...(this.callContext || {}),
        metadata: { videoPausedForNetwork: true }
      });
    } catch {
      // Low bitrate mode remains active when pausing an encoding is unsupported.
    }
  }

  private async restoreVideoAfterNetworkRecovery() {
    if (!this.videoPausedForNetwork()) return;
    try {
      await this.setVideoEncodingActive(true);
      if (this.cameraWasEnabledBeforeNetworkPause) {
        this.localStream()
          ?.getVideoTracks()
          .forEach((track) => (track.enabled = true));
        this.cameraEnabled.set(true);
      }
      this.videoPausedForNetwork.set(false);
      this.cameraWasEnabledBeforeNetworkPause = false;
      this.emitSignal(CALL_SOCKET_EVENTS.MEDIA_STATE, {
        ...(this.callContext || {}),
        metadata: { videoPausedForNetwork: false }
      });
    } catch {
      // Keep audio stable and retry after another healthy sample.
    }
  }

  private async startIncomingAlert() {
    await this.startRingToneLoop(true);
  }

  private async startOutgoingAlert() {
    await this.startRingToneLoop(false);
  }

  private async startRingToneLoop(showNotification: boolean) {
    if (this.ringtoneTimer) return;
    await this.playRingTone();
    this.ringtoneTimer = setInterval(() => void this.playRingTone(), 1_800);
    if (
      showNotification &&
      typeof document !== 'undefined' &&
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      this.incomingNotification?.close();
      this.incomingNotification = new Notification(`${this.participant().name} is calling`, {
        body: `${this.callMode() === 'video' ? 'Video' : 'Voice'} call · Open to accept or decline.`,
        icon: this.participant().imageUrl
      });
      this.incomingNotification.onclick = () => {
        window.focus();
        this.incomingNotification?.close();
      };
    }
  }

  private stopIncomingAlert() {
    if (this.ringtoneTimer) clearInterval(this.ringtoneTimer);
    this.ringtoneTimer = null;
    this.incomingNotification?.close();
    this.incomingNotification = null;
  }

  private showOngoingCallNotification() {
    if (
      typeof window === 'undefined' ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted' ||
      !this.hasActiveCall()
    ) {
      return;
    }
    this.ongoingCallNotification?.close();
    this.ongoingCallNotification = new Notification(`Call with ${this.participant().name}`, {
      body: `${this.callMode() === 'video' ? 'Video' : 'Voice'} call active · Tap to return to call controls.`,
      icon: this.participant().imageUrl || '/icons/icon-192x192.png',
      tag: 'hopehub-active-call',
      requireInteraction: true,
      silent: true
    });
    this.ongoingCallNotification.onclick = () => {
      window.focus();
      this.requestCallUiRestore();
      this.ongoingCallNotification?.close();
      this.ongoingCallNotification = null;
    };
  }

  private closeOngoingCallNotification() {
    this.ongoingCallNotification?.close();
    this.ongoingCallNotification = null;
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

  private async primeRingTone() {
    if (typeof window === 'undefined') return;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    this.ringtoneContext ||= new AudioContextConstructor();
    try {
      await this.ringtoneContext.resume();
      this.incomingAlertsEnabled.set(this.ringtoneContext.state === 'running');
    } catch {
      this.incomingAlertsEnabled.set(false);
    }
  }

  private async playStatusTone(kind: 'connected' | 'ended') {
    if (typeof window === 'undefined') return;
    await this.primeRingTone();
    if (!this.ringtoneContext || this.ringtoneContext.state !== 'running') return;

    const context = this.ringtoneContext;
    const notes = kind === 'connected' ? [520, 740] : [420, 260];
    const noteLength = kind === 'connected' ? 0.12 : 0.16;
    const gap = 0.045;

    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * (noteLength + gap);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + noteLength);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + noteLength + 0.01);
    });
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
    // setRemoteDescription()/ICE callbacks can mark the peer connected before this method runs.
    // Never arm the initial-connection timer after media has already connected; otherwise a later
    // temporary disconnect can let this stale timer end a healthy call as `media_timeout` while
    // the dedicated reconnect timer is already recovering it.
    if (this.peerHasConnected()) return;
    this.mediaTimeout = setTimeout(() => {
      this.mediaTimeout = null;
      if (this.peerHasConnected() || this.state() === 'ended' || this.state() === 'reconnecting') {
        return;
      }
      void this.failCall(
        'media_timeout',
        'Call could not connect. Please try again or continue in chat.'
      );
    }, MEDIA_CONNECT_TIMEOUT_MS);
  }

  private peerHasConnected() {
    const connectionState = this.pc?.connectionState;
    const iceState = this.pc?.iceConnectionState;
    return Boolean(
      this.connectedAt ||
      this.firstRemoteMediaAt ||
      this.state() === 'connected' ||
      connectionState === 'connected' ||
      iceState === 'connected' ||
      iceState === 'completed'
    );
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
    this.clearRecoveryContext();
    if (context) {
      this.setCallSummary(
        context.consultationId,
        reason === 'no_answer' ? 'No answer' : 'Call could not connect',
        message
      );
    }
    this.cleanup('ended');
    void this.playStatusTone('ended');
    this.error.set(message);
  }

  private setCallSummary(consultationId: string, title: string, message: string) {
    this.lastCallSummary.set({
      callId: this.activeCallId,
      consultationId,
      targetUserId: this.activeTargetUserId(),
      mode: this.callMode(),
      participant: this.participant(),
      title,
      message,
      endedAt: Date.now()
    });
  }

  private startDeliveryAckTimeout() {
    this.clearDeliveryAckTimeout();
    this.deliveryAckTimeout = setTimeout(() => {
      if (this.state() !== 'ringing' || this.remoteRinging()) return;
      this.receiverUnavailable.set(true);
    }, DELIVERY_ACK_TIMEOUT_MS);
  }

  private clearDeliveryAckTimeout() {
    if (this.deliveryAckTimeout) clearTimeout(this.deliveryAckTimeout);
    this.deliveryAckTimeout = null;
  }

  private startOfferRetry(
    offer: RTCSessionDescriptionInit,
    context: { consultationId: string; targetUserId: string; mode: CallMode }
  ) {
    this.clearOfferRetry();
    this.offerRetryTimer = setInterval(() => {
      if (this.state() !== 'ringing' || this.remoteRinging()) {
        this.clearOfferRetry();
        return;
      }
      this.emitSignal(CALL_SOCKET_EVENTS.OFFER, {
        consultationId: context.consultationId,
        targetUserId: context.targetUserId,
        mode: context.mode,
        sdp: offer,
        metadata: {
          ...this.callMetadata(),
          privacyRelay: this.privacyRelay(),
          deliveryRetry: true
        }
      });
    }, OFFER_RETRY_INTERVAL_MS);
  }

  private clearOfferRetry() {
    if (this.offerRetryTimer) clearInterval(this.offerRetryTimer);
    this.offerRetryTimer = null;
  }

  private resetIncomingAcceptance(offer: PendingOffer) {
    this.localStream()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.localStream.set(null);
    this.remoteStream.set(null);
    this.pc?.close();
    this.pc = null;
    this.pendingOffer.set(offer);
    this.incomingCall.set(true);
    this.answerRequested.set(false);
    this.queuedAcceptIceServers = null;
    this.makingOffer = false;
    this.isSettingRemoteAnswerPending = false;
    void this.startIncomingAlert();
  }

  private persistRecoveryContext() {
    if (!this.callContext || typeof sessionStorage === 'undefined') return;
    const recovery: RecoverableCall = {
      callId: this.activeCallId,
      ...this.callContext,
      mode: this.callMode(),
      participant: this.participant(),
      privacyRelay: this.privacyRelay(),
      isInitiator: this.isInitiator,
      signalSequence: this.signalSequence,
      savedAt: Date.now()
    };
    try {
      sessionStorage.setItem(CALL_RECOVERY_KEY, JSON.stringify(recovery));
    } catch {
      // Call recovery remains optional when storage is unavailable.
    }
  }

  private restoreRecoveryContext() {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(CALL_RECOVERY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecoverableCall;
      const valid =
        typeof parsed.consultationId === 'string' &&
        typeof parsed.targetUserId === 'string' &&
        (parsed.mode === 'audio' || parsed.mode === 'video') &&
        Date.now() - Number(parsed.savedAt || 0) <= CALL_RECOVERY_MAX_AGE_MS;
      if (!valid) {
        sessionStorage.removeItem(CALL_RECOVERY_KEY);
        return;
      }
      this.recoverableCall.set(parsed);
      this.setParticipant(parsed.participant || { name: 'Hope Hub member' });
    } catch {
      sessionStorage.removeItem(CALL_RECOVERY_KEY);
    }
  }

  private clearRecoveryContext() {
    this.recoverableCall.set(null);
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem(CALL_RECOVERY_KEY);
    } catch {
      // Ignore blocked storage.
    }
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
    const audioSettings = this.localStream()?.getAudioTracks()[0]?.getSettings?.();
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
      mode: this.callMode(),
      privacyRelay: this.privacyRelay(),
      gatheredCandidateCount: this.gatheredCandidateCount,
      gatheredRelayCandidateCount: this.gatheredRelayCandidateCount,
      gatheredCandidateTypes: [...this.gatheredCandidateTypes].sort().join(',') || undefined,
      lowDataMode: this.lowDataMode(),
      backgroundBlurEnabled: this.backgroundBlurEnabled(),
      networkType: this.networkProfile().type,
      networkEffectiveType: this.networkProfile().effectiveType,
      networkSaveData: this.networkProfile().saveData,
      relayRequiredByNetwork: this.networkProfile().requiresRelay,
      connectivityPreflightSource: this.connectivityPreflightSource,
      connectivityCheckMs: this.connectivityCheckMs,
      mediaAcquisitionMs: this.mediaAcquisitionMs,
      preparedStreamReused: this.preparedStreamReused,
      audioEchoCancellation: audioSettings?.echoCancellation,
      audioNoiseSuppression: audioSettings?.noiseSuppression,
      audioAutoGainControl: audioSettings?.autoGainControl,
      audioChannelCount: audioSettings?.channelCount,
      audioSampleRate: audioSettings?.sampleRate,
      videoPausedForNetwork: this.videoPausedForNetwork(),
      setupToRingAckMs:
        this.callStartedAt && this.ringAcknowledgedAt
          ? this.ringAcknowledgedAt - this.callStartedAt
          : undefined,
      setupToAnswerMs:
        this.callStartedAt && this.answerReceivedAt
          ? this.answerReceivedAt - this.callStartedAt
          : undefined,
      setupToFirstMediaMs:
        this.callStartedAt && this.firstRemoteMediaAt
          ? this.firstRemoteMediaAt - this.callStartedAt
          : undefined,
      setupToConnectedMs:
        this.callStartedAt && this.connectedAt ? this.connectedAt - this.callStartedAt : undefined
    };
  }

  private async recoverDisconnectedDevices() {
    const previousAudioInput = this.selectedAudioInputId();
    const previousVideoInput = this.selectedVideoInputId();
    const previousAudioOutput = this.selectedAudioOutputId();
    await this.refreshMediaDevices();
    if (!this.hasActiveCall() || !this.localStream()) return;

    const messages: string[] = [];
    try {
      const audioTrack = this.localStream()?.getAudioTracks()[0];
      if (
        audioTrack?.readyState === 'ended' ||
        (previousAudioInput &&
          !this.audioInputs().some((item) => item.deviceId === previousAudioInput))
      ) {
        await this.selectAudioInput('');
        messages.push('Microphone switched');
      }
      const videoTrack = this.localStream()?.getVideoTracks()[0];
      if (
        this.callMode() === 'video' &&
        (videoTrack?.readyState === 'ended' ||
          (previousVideoInput &&
            !this.videoInputs().some((item) => item.deviceId === previousVideoInput)))
      ) {
        await this.selectVideoInput('');
        messages.push('Camera switched');
      }
      if (
        previousAudioOutput &&
        !this.audioOutputs().some((item) => item.deviceId === previousAudioOutput)
      ) {
        this.selectAudioOutput('');
        messages.push('Sound moved to the system speaker');
      }
      this.deviceRecoveryMessage.set(messages.join(' · '));
    } catch {
      this.deviceRecoveryMessage.set('A call device disconnected. Open Devices to choose another.');
    }
  }

  private registerHardwareCallControls() {
    const mediaSession = navigator.mediaSession as
      { setActionHandler(action: string, handler: (() => void) | null): void } | undefined;
    if (!mediaSession) return;
    const register = (action: string, handler: () => void) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // The browser may expose Media Session without call-specific headset actions.
      }
    };
    register('hangup', () => void this.endCurrentCall());
    register('togglemicrophone', () => this.setMicEnabled(!this.micEnabled()));
    register('togglecamera', () => this.setCameraEnabled(!this.cameraEnabled()));
  }

  private updateMediaSessionCallState() {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return;
    try {
      if (typeof MediaMetadata !== 'undefined') {
        const participantImageUrl = this.participant().imageUrl;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.participant().name,
          artist: `Hope Hub ${this.callMode() === 'video' ? 'video' : 'voice'} call`,
          album: 'Private 1:1 support',
          artwork: participantImageUrl
            ? [{ src: participantImageUrl }]
            : [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
        });
      }
      navigator.mediaSession.playbackState = 'playing';
    } catch {
      // Lock-screen call metadata is an optional progressive enhancement.
    }
  }

  private clearMediaSessionCallState() {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return;
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch {
      // Ignore browsers with a partial Media Session implementation.
    }
  }

  private startSpeakingMeter() {
    if (this.speakingMeterTimer || typeof window === 'undefined') return;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const local = this.localStream();
    const remote = this.remoteStream();
    if (!local?.getAudioTracks().length && !remote?.getAudioTracks().length) return;
    try {
      this.speakingMeterContext = new AudioContextConstructor();
      if (local?.getAudioTracks().length) {
        this.localAnalyser = this.speakingMeterContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        this.speakingMeterContext.createMediaStreamSource(local).connect(this.localAnalyser);
      }
      if (remote?.getAudioTracks().length) {
        this.remoteAnalyser = this.speakingMeterContext.createAnalyser();
        this.remoteAnalyser.fftSize = 256;
        this.speakingMeterContext.createMediaStreamSource(remote).connect(this.remoteAnalyser);
      }
      this.speakingMeterTimer = setInterval(() => {
        this.localSpeaking.set(this.micEnabled() && this.analyserIsSpeaking(this.localAnalyser));
        this.remoteSpeaking.set(this.analyserIsSpeaking(this.remoteAnalyser));
      }, 160);
    } catch {
      this.stopSpeakingMeter();
    }
  }

  private analyserIsSpeaking(analyser: AnalyserNode | null) {
    if (!analyser) return false;
    const samples = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(samples);
    let energy = 0;
    for (const sample of samples) {
      const normalized = (sample - 128) / 128;
      energy += normalized * normalized;
    }
    return Math.sqrt(energy / samples.length) > 0.035;
  }

  private stopSpeakingMeter() {
    if (this.speakingMeterTimer) clearInterval(this.speakingMeterTimer);
    this.speakingMeterTimer = null;
    this.localAnalyser = null;
    this.remoteAnalyser = null;
    void this.speakingMeterContext?.close().catch(() => undefined);
    this.speakingMeterContext = null;
    this.localSpeaking.set(false);
    this.remoteSpeaking.set(false);
  }

  setPrivacyRelay(enabled: boolean) {
    this.privacyRelay.set(enabled);
  }

  async testConnectivity(
    iceServers: IceServerConfig[],
    requireRelay = false,
    force = false
  ): Promise<ConnectivityResult> {
    const cacheKey = this.connectivityCacheKey(iceServers, requireRelay);
    if (!force) {
      const cached = this.readConnectivityCache(cacheKey);
      if (cached) {
        this.connectivityPreflightSource = 'cache';
        this.connectivityCheckMs = 0;
        return cached;
      }
      const inFlight = this.connectivityChecks.get(cacheKey);
      if (inFlight) {
        this.connectivityPreflightSource = 'shared';
        return inFlight;
      }
    }

    const startedAt = performance.now();
    const check = this.runConnectivityTest(iceServers, requireRelay)
      .then((result) => {
        this.connectivityPreflightSource = 'network';
        this.connectivityCheckMs = Math.max(0, Math.round(performance.now() - startedAt));
        if (result.ok) this.writeConnectivityCache(cacheKey, result);
        return result;
      })
      .finally(() => this.connectivityChecks.delete(cacheKey));
    this.connectivityChecks.set(cacheKey, check);
    return check;
  }

  prewarmConnectivity(iceServers: IceServerConfig[], requireRelay = false): void {
    void this.testConnectivity(iceServers, requireRelay).catch(() => undefined);
  }

  invalidateConnectivityCache() {
    this.connectivityChecks.clear();
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(CALL_CONNECTIVITY_CACHE_KEY);
    } catch {
      // Connectivity caching is optional when browser storage is blocked.
    }
  }

  private async runConnectivityTest(
    iceServers: IceServerConfig[],
    requireRelay: boolean
  ): Promise<ConnectivityResult> {
    if (typeof RTCPeerConnection === 'undefined') {
      return { ok: false, relay: false, message: 'Calls are not supported in this browser.' };
    }
    const pc = new RTCPeerConnection({
      iceServers: normalizeIceServers(iceServers),
      iceTransportPolicy: requireRelay ? 'relay' : 'all'
    });
    let foundCandidate = false;
    let foundRelay = false;
    try {
      pc.createDataChannel('hopehub-connectivity-test');
      let finishGathering: () => void = () => undefined;
      const gathering = new Promise<void>((resolve) => {
        let finished = false;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const finish = () => {
          if (finished) return;
          finished = true;
          if (timeout) clearTimeout(timeout);
          resolve();
        };
        timeout = setTimeout(finish, 6_000);
        finishGathering = finish;
      });
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          finishGathering();
          return;
        }
        foundCandidate = true;
        if (event.candidate.type === 'relay' || / typ relay /i.test(event.candidate.candidate)) {
          foundRelay = true;
        }
        if ((!requireRelay && foundCandidate) || (requireRelay && foundRelay)) finishGathering();
      };
      await pc.setLocalDescription(await pc.createOffer());
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') finishGathering();
      };
      if (pc.iceGatheringState === 'complete') finishGathering();
      await gathering;
      const ok = requireRelay ? foundRelay : foundCandidate;
      return {
        ok,
        relay: foundRelay,
        message: ok
          ? foundRelay
            ? 'Your protected connection is ready.'
            : 'Your connection is ready.'
          : requireRelay
            ? 'Extra privacy is unavailable right now. Turn it off and try again.'
            : 'We could not connect. Check your internet and try again.'
      };
    } catch {
      return { ok: false, relay: false, message: 'Could not complete the connection test.' };
    } finally {
      pc.close();
    }
  }

  private connectivityCacheKey(iceServers: IceServerConfig[], requireRelay: boolean): string {
    const profile = this.refreshNetworkProfile();
    const servers = iceServers
      .flatMap((server) => (Array.isArray(server.urls) ? server.urls : [server.urls]))
      .map((url) => url.trim().toLowerCase())
      .sort();
    const credentials = iceServers
      .map((server) => `${server.username || ''}:${server.credential || ''}`)
      .join('|');
    return JSON.stringify({
      servers,
      credentialFingerprint: this.shortFingerprint(credentials),
      requireRelay,
      networkType: profile.type,
      effectiveType: profile.effectiveType,
      saveData: profile.saveData,
      online: this.connectionOnline()
    });
  }

  private shortFingerprint(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  private readConnectivityCache(key: string): ConnectivityResult | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const cached = JSON.parse(
        localStorage.getItem(CALL_CONNECTIVITY_CACHE_KEY) || 'null'
      ) as CachedConnectivityResult | null;
      if (!cached || cached.key !== key || cached.expiresAt <= Date.now() || !cached.result?.ok) {
        return null;
      }
      return cached.result;
    } catch {
      localStorage.removeItem(CALL_CONNECTIVITY_CACHE_KEY);
      return null;
    }
  }

  private writeConnectivityCache(key: string, result: ConnectivityResult) {
    if (typeof localStorage === 'undefined') return;
    try {
      const cached: CachedConnectivityResult = {
        key,
        expiresAt: Date.now() + CALL_CONNECTIVITY_CACHE_TTL_MS,
        result
      };
      localStorage.setItem(CALL_CONNECTIVITY_CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Connectivity caching is optional when browser storage is blocked.
    }
  }

  private emitSignal(event: string, payload: Record<string, unknown>) {
    if (!this.socket || !this.activeCallId) return;
    this.signalSequence += 1;
    this.socket.emit(event, {
      ...payload,
      callId: this.activeCallId,
      sequence: this.signalSequence,
      clientTimestamp: new Date().toISOString()
    });
    if (this.callContext && event !== CALL_SOCKET_EVENTS.ICE) this.persistRecoveryContext();
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
