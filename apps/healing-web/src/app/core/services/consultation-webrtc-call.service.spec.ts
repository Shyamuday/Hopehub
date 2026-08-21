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
