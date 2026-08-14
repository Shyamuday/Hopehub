import {
  providerSessionModeFromValue,
  providerSessionModeMatchesText,
  type ProviderConsumerSessionMode,
  type ProviderSessionMode,
} from '@hopehub/contracts';

type LiveConnectService = {
  id: string;
  title: string;
  description?: string | null;
  pricingLabel?: string;
};

export type LiveConnectProviderLike = {
  supportedModes?: readonly ProviderSessionMode[];
  acceptsChat?: boolean;
  acceptsVoiceCall?: boolean;
  acceptsVideoCall?: boolean;
  supportRole?: string | null;
  careTeamType?: string | null;
  supportRoleLabel?: string | null;
  supportTierLabel?: string | null;
  specialty?: string | null;
  designation?: string | null;
  services?: LiveConnectService[];
};

export function providerAcceptsLiveConnectMode(
  provider: LiveConnectProviderLike,
  mode: ProviderConsumerSessionMode,
): boolean {
  const canonicalMode = providerSessionModeFromValue(mode);
  if (
    canonicalMode &&
    provider.supportedModes?.length &&
    !provider.supportedModes.includes(canonicalMode)
  ) {
    return false;
  }
  if (mode === 'chat') return provider.acceptsChat !== false;
  if (mode === 'voice') return provider.acceptsVoiceCall !== false;
  return provider.acceptsVideoCall !== false;
}

export function providerServiceForLiveConnectMode<T extends LiveConnectService>(
  provider: Omit<LiveConnectProviderLike, 'services'> & { services?: T[] },
  mode: ProviderConsumerSessionMode,
): T | null {
  const canonicalMode = providerSessionModeFromValue(mode);
  const services = provider.services || [];
  if (!canonicalMode) return services[0] || null;
  return (
    services.find((service) =>
      providerSessionModeMatchesText(
        canonicalMode,
        [service.title, service.description, service.pricingLabel].filter(Boolean).join(' '),
      ),
    ) ||
    services[0] ||
    null
  );
}

export function providerNeedsListenerSupportConsent(
  provider?: LiveConnectProviderLike | null,
  context: unknown[] = [],
): boolean {
  return /listener|volunteer|peer support/i.test(
    [
      provider?.supportRole,
      provider?.careTeamType,
      provider?.supportRoleLabel,
      provider?.supportTierLabel,
      provider?.specialty,
      provider?.designation,
      ...context,
    ]
      .filter(Boolean)
      .join(' '),
  );
}
