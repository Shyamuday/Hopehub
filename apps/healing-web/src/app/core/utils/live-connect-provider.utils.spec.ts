import {
  providerAcceptsLiveConnectMode,
  providerNeedsListenerSupportConsent,
  providerServiceForLiveConnectMode,
} from './live-connect-provider.utils';

describe('live-connect provider utilities', () => {
  it('uses canonical supported modes before legacy availability flags', () => {
    const provider = {
      supportedModes: ['CHAT'] as const,
      acceptsChat: true,
      acceptsVideoCall: true,
    };

    expect(providerAcceptsLiveConnectMode(provider, 'chat')).toBeTruthy();
    expect(providerAcceptsLiveConnectMode(provider, 'video')).toBeFalsy();
  });

  it('treats an omitted legacy flag as available for older provider payloads', () => {
    expect(providerAcceptsLiveConnectMode({}, 'voice')).toBeTruthy();
  });

  it('selects the service matching the requested session mode', () => {
    const video = { id: 'video', title: 'Private video session' };
    const chat = { id: 'chat', title: 'Private text chat' };

    expect(providerServiceForLiveConnectMode({ services: [video, chat] }, 'chat')).toBe(chat);
  });

  it('falls back to the first service when no mode-specific service exists', () => {
    const first = { id: 'general', title: 'General emotional support' };

    expect(providerServiceForLiveConnectMode({ services: [first] }, 'voice')).toBe(first);
  });

  it('detects listener scope from provider metadata or booking context', () => {
    expect(
      providerNeedsListenerSupportConsent({ supportRoleLabel: 'Peer support listener' }),
    ).toBeTruthy();
    expect(providerNeedsListenerSupportConsent(null, ['Volunteer support session'])).toBeTruthy();
    expect(providerNeedsListenerSupportConsent({ specialty: 'Clinical psychologist' })).toBeFalsy();
  });
});
