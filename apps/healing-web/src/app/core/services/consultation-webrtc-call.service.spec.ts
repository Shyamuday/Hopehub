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
