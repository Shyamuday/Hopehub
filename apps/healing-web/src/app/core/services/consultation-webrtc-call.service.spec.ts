import { ConsultationWebrtcCallService } from '../../../../../../libs/platform-ui/src/consultation-call/consultation-webrtc-call.service';
import {
  CALL_SOCKET_EVENTS,
  type CallSignalingSocket,
} from '../../../../../../libs/platform-ui/src/consultation-call/webrtc-call.types';

describe('ConsultationWebrtcCallService incoming signaling', () => {
  it('continues the incoming-call sequence when sending the answer', async () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const socket: CallSignalingSocket = {
      emit: (event, payload) => emitted.push({ event, payload }),
      on: () => undefined,
    };
    const service = new ConsultationWebrtcCallService();
    const internals = service as unknown as {
      socket: CallSignalingSocket;
      activeCallId: string;
      signalSequence: number;
      pc: {
        setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
        createAnswer: () => Promise<RTCSessionDescriptionInit>;
        setLocalDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
      } | null;
      resolveRelayPolicy: () => Promise<boolean>;
      acquireCallLock: () => boolean;
      ensurePeer: () => Promise<void>;
      flushIceQueue: () => Promise<void>;
      persistRecoveryContext: () => void;
      stopIncomingAlert: () => void;
      startMediaTimeout: () => void;
    };

    internals.socket = socket;
    internals.activeCallId = 'incoming-call-1';
    // RING and OFFER acknowledgements have already used sequences 1 and 2.
    internals.signalSequence = 2;
    internals.resolveRelayPolicy = async () => false;
    internals.acquireCallLock = () => true;
    internals.ensurePeer = async () => undefined;
    internals.flushIceQueue = async () => undefined;
    internals.persistRecoveryContext = () => undefined;
    internals.stopIncomingAlert = () => undefined;
    internals.startMediaTimeout = () => undefined;
    internals.pc = {
      setRemoteDescription: async () => undefined,
      createAnswer: async () => ({ type: 'answer', sdp: 'answer-sdp' }),
      setLocalDescription: async () => undefined,
    };

    service.pendingOffer.set({
      callId: 'incoming-call-1',
      fromUserId: 'caller-1',
      consultationId: 'consultation-1',
      mode: 'audio',
      sdp: { type: 'offer', sdp: 'offer-sdp' },
    });

    const originalRtcSessionDescription = globalThis.RTCSessionDescription;
    Object.defineProperty(globalThis, 'RTCSessionDescription', {
      configurable: true,
      value: class {
        readonly type: RTCSdpType;
        readonly sdp: string;

        constructor(description: RTCSessionDescriptionInit) {
          this.type = description.type ?? 'offer';
          this.sdp = description.sdp ?? '';
        }

        toJSON() {
          return { type: this.type, sdp: this.sdp };
        }
      },
    });

    try {
      await service.acceptIncoming([]);
    } finally {
      Object.defineProperty(globalThis, 'RTCSessionDescription', {
        configurable: true,
        value: originalRtcSessionDescription,
      });
    }

    expect(emitted).toContainEqual({
      event: CALL_SOCKET_EVENTS.ANSWER,
      payload: expect.objectContaining({
        callId: 'incoming-call-1',
        sequence: 3,
      }),
    });
  });
});

describe('ConsultationWebrtcCallService call preflight', () => {
  it('reuses a successful connectivity check during its network-aware TTL', async () => {
    const service = new ConsultationWebrtcCallService();
    service.invalidateConnectivityCache();
    let checks = 0;
    const internals = service as unknown as {
      runConnectivityTest: () => Promise<{ ok: boolean; relay: boolean; message: string }>;
    };
    internals.runConnectivityTest = async () => {
      checks += 1;
      return { ok: true, relay: true, message: 'Ready' };
    };
    const servers = [
      {
        urls: 'turn:turn.hopehub.in:3478?transport=udp',
        username: 'test-user',
        credential: 'test-secret',
      },
    ];

    await service.testConnectivity(servers, true);
    await service.testConnectivity(servers, true);

    expect(checks).toBe(1);
    service.invalidateConnectivityCache();
  });

  it('adopts a live prepared stream without requesting the devices again', async () => {
    const service = new ConsultationWebrtcCallService();
    let permissionChecks = 0;
    let mediaRequests = 0;
    const audioTrack = { readyState: 'live', stop: vi.fn() } as unknown as MediaStreamTrack;
    const stream = {
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [],
      getTracks: () => [audioTrack],
    } as unknown as MediaStream;
    const internals = service as unknown as {
      ensureMediaAccess: (() => Promise<{ granted: boolean }>) | null;
      acquireMediaStream: () => Promise<MediaStream>;
      ensurePeer: (
        mode: 'audio' | 'video',
        iceServers: unknown[],
        privacyRelay: boolean,
        preparedStream?: MediaStream,
      ) => Promise<void>;
    };
    internals.ensureMediaAccess = async () => {
      permissionChecks += 1;
      return { granted: true };
    };
    internals.acquireMediaStream = async () => {
      mediaRequests += 1;
      return stream;
    };

    const originalPeerConnection = globalThis.RTCPeerConnection;
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      value: class {
        connectionState = 'new';
        iceConnectionState = 'new';
        ontrack = null;
        onicecandidate = null;
        onconnectionstatechange = null;
        oniceconnectionstatechange = null;
        addTrack() {
          return {};
        }
      },
    });

    try {
      await internals.ensurePeer('audio', [], false, stream);
    } finally {
      Object.defineProperty(globalThis, 'RTCPeerConnection', {
        configurable: true,
        value: originalPeerConnection,
      });
    }

    expect(service.localStream()).toBe(stream);
    expect(permissionChecks).toBe(0);
    expect(mediaRequests).toBe(0);
  });
});

describe('ConsultationWebrtcCallService resilient signaling', () => {
  it('upgrades voice to video inside the same call without sending a hang-up', async () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const socket: CallSignalingSocket = {
      emit: (event, payload) => emitted.push({ event, payload }),
      on: () => undefined,
    };
    const service = new ConsultationWebrtcCallService();
    const localDescription = { type: 'offer', sdp: 'same-call-video-offer' } as const;
    const internals = service as unknown as {
      socket: CallSignalingSocket;
      activeCallId: string;
      callContext: { consultationId: string; targetUserId: string };
      pc: {
        signalingState: RTCSignalingState;
        localDescription: RTCSessionDescriptionInit | null;
        createOffer: () => Promise<RTCSessionDescriptionInit>;
        setLocalDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
      };
      addLocalVideoTrack: () => Promise<void>;
      applyVideoProfile: () => Promise<void>;
      persistRecoveryContext: () => void;
    };
    internals.socket = socket;
    internals.activeCallId = 'existing-call-1';
    internals.callContext = { consultationId: 'consultation-1', targetUserId: 'provider-1' };
    internals.addLocalVideoTrack = vi.fn().mockResolvedValue(undefined);
    internals.applyVideoProfile = vi.fn().mockResolvedValue(undefined);
    internals.persistRecoveryContext = vi.fn();
    internals.pc = {
      signalingState: 'stable',
      localDescription: null,
      createOffer: async () => localDescription,
      setLocalDescription: async (description) => {
        internals.pc.localDescription = description;
      },
    };
    service.callMode.set('audio');
    service.state.set('connected');

    await service.switchCurrentCallMode('video');

    expect(service.state()).toBe('connected');
    expect(service.callMode()).toBe('video');
    expect(emitted.some(({ event }) => event === CALL_SOCKET_EVENTS.END)).toBe(false);
    expect(emitted).toContainEqual({
      event: CALL_SOCKET_EVENTS.OFFER,
      payload: expect.objectContaining({
        callId: 'existing-call-1',
        mode: 'video',
        metadata: expect.objectContaining({ modeSwitch: true, previousMode: 'audio' }),
      }),
    });
  });

  it('keeps the voice call connected when camera access fails during an upgrade', async () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const service = new ConsultationWebrtcCallService();
    const internals = service as unknown as {
      socket: CallSignalingSocket;
      activeCallId: string;
      callContext: { consultationId: string; targetUserId: string };
      pc: { signalingState: RTCSignalingState };
      addLocalVideoTrack: () => Promise<void>;
      removeLocalVideoTrack: () => Promise<void>;
    };
    internals.socket = {
      emit: (event, payload) => emitted.push({ event, payload }),
      on: () => undefined,
    };
    internals.activeCallId = 'voice-call-1';
    internals.callContext = { consultationId: 'consultation-1', targetUserId: 'provider-1' };
    internals.pc = { signalingState: 'stable' };
    internals.addLocalVideoTrack = vi
      .fn()
      .mockRejectedValue(new Error('Camera permission denied.'));
    internals.removeLocalVideoTrack = vi.fn().mockResolvedValue(undefined);
    service.callMode.set('audio');
    service.state.set('connected');

    await expect(service.switchCurrentCallMode('video')).rejects.toThrow(
      'Camera permission denied.',
    );

    expect(service.state()).toBe('connected');
    expect(service.callMode()).toBe('audio');
    expect(service.error()).toContain('Voice is still connected');
    expect(emitted.some(({ event }) => event === CALL_SOCKET_EVENTS.END)).toBe(false);
  });

  it('keeps connected peer media active during a signaling-server restart', () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket: CallSignalingSocket = {
      emit: () => undefined,
      on: (event, handler) => handlers.set(event, handler),
      off: () => undefined,
    };
    const service = new ConsultationWebrtcCallService();
    const internals = service as unknown as {
      callContext: { consultationId: string; targetUserId: string } | null;
      activeCallId: string;
      pc: { connectionState: string; iceConnectionState: string } | null;
    };
    internals.callContext = { consultationId: 'consultation-1', targetUserId: 'provider-1' };
    internals.activeCallId = 'call-1';
    internals.pc = { connectionState: 'connected', iceConnectionState: 'connected' };
    service.state.set('connected');
    service.bindSocket(socket);

    handlers.get('disconnect')?.('transport close');

    expect(service.state()).toBe('connected');
    expect(service.signalingInterrupted()).toBe(true);
    expect(service.deviceRecoveryMessage()).toContain('service update');
  });

  it('uses the server sequence checkpoint before sending recovery signals', () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const socket: CallSignalingSocket = {
      emit: (event, payload) => emitted.push({ event, payload }),
      on: (event, handler) => handlers.set(event, handler),
      off: () => undefined,
    };
    const service = new ConsultationWebrtcCallService();
    const internals = service as unknown as {
      callContext: { consultationId: string; targetUserId: string } | null;
      activeCallId: string;
      signalSequence: number;
      attemptIceRestart: () => Promise<void>;
    };
    internals.callContext = { consultationId: 'consultation-1', targetUserId: 'provider-1' };
    internals.activeCallId = 'call-1';
    internals.signalSequence = 2;
    internals.attemptIceRestart = async () => undefined;
    service.state.set('reconnecting');
    service.bindSocket(socket);

    handlers.get(CALL_SOCKET_EVENTS.STATE)?.({
      active: true,
      callId: 'call-1',
      lastAcceptedSequence: 12,
    });

    expect(internals.signalSequence).toBe(12);
    const stored = JSON.parse(sessionStorage.getItem('hopehub:recoverable-call') || '{}') as {
      signalSequence?: number;
    };
    expect(stored.signalSequence).toBe(12);
    expect(emitted).toEqual([]);
    sessionStorage.removeItem('hopehub:recoverable-call');
  });

  it('closes the local screen when the server confirms the other side ended the call', () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket: CallSignalingSocket = {
      emit: () => undefined,
      on: (event, handler) => handlers.set(event, handler),
      off: () => undefined,
    };
    const service = new ConsultationWebrtcCallService();
    const close = vi.fn();
    const internals = service as unknown as {
      callContext: { consultationId: string; targetUserId: string } | null;
      activeCallId: string;
      pc: { close: () => void } | null;
    };
    internals.callContext = { consultationId: 'consultation-1', targetUserId: 'provider-1' };
    internals.activeCallId = 'call-1';
    internals.pc = { close };
    service.activeConsultationId.set('consultation-1');
    service.activeTargetUserId.set('provider-1');
    service.state.set('connected');
    service.bindSocket(socket);

    handlers.get(CALL_SOCKET_EVENTS.STATE)?.({
      consultationId: 'consultation-1',
      callId: 'call-1',
      active: false,
      reason: 'ended_by_user',
    });

    expect(close).toHaveBeenCalled();
    expect(service.state()).toBe('ended');
    expect(service.lastCallSummary()?.title).toBe('Call ended');
  });
});

describe('ConsultationWebrtcCallService premium recovery automation', () => {
  it('does not let the initial media timeout end a call that already connected', () => {
    vi.useFakeTimers();
    const service = new ConsultationWebrtcCallService();
    const failCall = vi.fn();
    const internals = service as unknown as {
      connectedAt: number;
      pc: {
        connectionState: RTCPeerConnectionState;
        iceConnectionState: RTCIceConnectionState;
        close: () => void;
      };
      startMediaTimeout: () => void;
      failCall: (reason: string, message: string) => Promise<void>;
    };
    internals.connectedAt = Date.now();
    internals.pc = {
      connectionState: 'disconnected',
      iceConnectionState: 'disconnected',
      close: () => undefined,
    };
    internals.failCall = failCall;
    service.state.set('reconnecting');

    internals.startMediaTimeout();
    vi.advanceTimersByTime(30_000);

    expect(failCall).not.toHaveBeenCalled();
    service.cleanup();
    vi.useRealTimers();
  });

  it('forces relay-only ICE when protected calling is selected', async () => {
    const service = new ConsultationWebrtcCallService();
    const audioTrack = {
      kind: 'audio',
      readyState: 'live',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;
    const stream = {
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [],
      getTracks: () => [audioTrack],
    } as unknown as MediaStream;
    let peerConfiguration: RTCConfiguration | undefined;
    const originalPeerConnection = globalThis.RTCPeerConnection;
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      value: class {
        connectionState = 'new';
        iceConnectionState = 'new';
        ontrack = null;
        onicecandidate = null;
        onconnectionstatechange = null;
        oniceconnectionstatechange = null;

        constructor(configuration: RTCConfiguration) {
          peerConfiguration = configuration;
        }

        addTrack() {
          return { track: audioTrack };
        }

        close() {}
      },
    });
    const internals = service as unknown as {
      ensurePeer: (
        mode: 'audio' | 'video',
        iceServers: RTCIceServer[],
        privacyRelay: boolean,
        preparedStream: MediaStream,
      ) => Promise<void>;
    };

    try {
      await internals.ensurePeer(
        'audio',
        [
          {
            urls: 'turns:turn.hopehub.in:443?transport=tcp',
            username: 'temporary-user',
            credential: 'temporary-secret',
          },
        ],
        true,
        stream,
      );
      expect(peerConfiguration?.iceTransportPolicy).toBe('relay');
      expect(peerConfiguration?.iceServers).toEqual([
        {
          urls: 'turns:turn.hopehub.in:443?transport=tcp',
          username: 'temporary-user',
          credential: 'temporary-secret',
        },
      ]);
    } finally {
      service.cleanup();
      Object.defineProperty(globalThis, 'RTCPeerConnection', {
        configurable: true,
        value: originalPeerConnection,
      });
    }
  });

  it('pauses video after sustained poor quality and restores it only after stable recovery', async () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const service = new ConsultationWebrtcCallService();
    const videoTrack = {
      kind: 'video',
      readyState: 'live',
      enabled: true,
      stop: vi.fn(),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    } as unknown as MediaStreamTrack;
    const stream = {
      getAudioTracks: () => [],
      getVideoTracks: () => [videoTrack],
      getTracks: () => [videoTrack],
    } as unknown as MediaStream;
    const sender = {
      track: videoTrack,
      getParameters: () => ({ encodings: [{}] }),
      setParameters: vi.fn().mockResolvedValue(undefined),
    } as unknown as RTCRtpSender;
    let packetsLost = 0;
    let packetsReceived = 0;
    let poor = true;
    const stats = {
      forEach(callback: (report: Record<string, unknown>) => void) {
        packetsLost += poor ? 10 : 0;
        packetsReceived += poor ? 90 : 100;
        callback({
          type: 'inbound-rtp',
          isRemote: false,
          packetsLost,
          packetsReceived,
          jitter: poor ? 0.09 : 0.005,
        });
        callback({
          type: 'candidate-pair',
          state: 'succeeded',
          selected: true,
          currentRoundTripTime: poor ? 0.7 : 0.04,
        });
      },
    };
    const internals = service as unknown as {
      socket: CallSignalingSocket;
      activeCallId: string;
      callContext: { consultationId: string; targetUserId: string };
      pc: {
        getStats: () => Promise<typeof stats>;
        getSenders: () => RTCRtpSender[];
        close: () => void;
      };
      sampleNetworkQuality: () => Promise<void>;
    };
    internals.socket = {
      emit: (event, payload) => emitted.push({ event, payload }),
      on: () => undefined,
    };
    internals.activeCallId = 'network-call-1';
    internals.callContext = {
      consultationId: 'consultation-1',
      targetUserId: 'provider-1',
    };
    internals.pc = {
      getStats: async () => stats,
      getSenders: () => [sender],
      close: () => undefined,
    };
    service.localStream.set(stream);
    service.callMode.set('video');
    service.cameraEnabled.set(true);
    service.state.set('connected');

    for (let sample = 0; sample < 3; sample += 1) await internals.sampleNetworkQuality();
    await vi.waitFor(() => expect(service.videoPausedForNetwork()).toBe(true));
    expect(videoTrack.enabled).toBe(false);
    expect(service.networkQuality()).toBe('poor');

    poor = false;
    for (let sample = 0; sample < 5; sample += 1) await internals.sampleNetworkQuality();
    await vi.waitFor(() => expect(service.videoPausedForNetwork()).toBe(false));
    expect(videoTrack.enabled).toBe(true);
    expect(service.networkQuality()).toBe('good');
    expect(
      emitted
        .filter(({ event }) => event === CALL_SOCKET_EVENTS.MEDIA_STATE)
        .map(
          ({ payload }) =>
            (payload as { metadata?: { videoPausedForNetwork?: boolean } }).metadata
              ?.videoPausedForNetwork,
        ),
    ).toEqual([true, false]);
    service.cleanup();
  });

  it('marks an active call reconnecting offline and starts ICE recovery when online', async () => {
    const service = new ConsultationWebrtcCallService();
    const restart = vi.fn().mockResolvedValue(undefined);
    const internals = service as unknown as {
      callContext: { consultationId: string; targetUserId: string };
      pc: { close: () => void };
      attemptIceRestart: (force?: boolean) => Promise<void>;
      handleOffline: () => void;
      handleOnline: () => void;
    };
    internals.callContext = {
      consultationId: 'consultation-1',
      targetUserId: 'provider-1',
    };
    internals.pc = { close: () => undefined };
    internals.attemptIceRestart = restart;
    service.state.set('connected');

    internals.handleOffline();
    expect(service.connectionOnline()).toBe(false);
    expect(service.state()).toBe('reconnecting');

    internals.handleOnline();
    expect(service.connectionOnline()).toBe(true);
    await vi.waitFor(() => expect(restart).toHaveBeenCalledWith(true));
    service.cleanup();
  });

  it('asks the server for authoritative call state when the app returns to foreground', () => {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const service = new ConsultationWebrtcCallService();
    const internals = service as unknown as {
      socket: CallSignalingSocket;
      activeCallId: string;
      callContext: { consultationId: string; targetUserId: string };
      handleVisibilityChange: () => void;
    };
    internals.socket = {
      emit: (event, payload) => emitted.push({ event, payload }),
      on: () => undefined,
    };
    internals.activeCallId = 'foreground-call-1';
    internals.callContext = {
      consultationId: 'consultation-1',
      targetUserId: 'provider-1',
    };
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    try {
      internals.handleVisibilityChange();
      expect(emitted).toContainEqual({
        event: CALL_SOCKET_EVENTS.SYNC,
        payload: expect.objectContaining({
          consultationId: 'consultation-1',
          targetUserId: 'provider-1',
          callId: 'foreground-call-1',
        }),
      });
    } finally {
      if (visibilityDescriptor) {
        Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
      }
      service.cleanup();
    }
  });
});
