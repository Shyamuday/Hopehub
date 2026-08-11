import type { HopeHubProvider } from '../services/booking.service';

export const CONSUMER_AVAILABILITY_COPY = {
  liveNow: 'Live now',
  onlineNow: 'Online now',
  onlineJustNow: 'Online just now',
  onlineToday: 'Online today',
  usuallyRepliesSoon: 'Usually replies soon',
  usuallyAvailableEvenings: 'Usually available evenings',
  nextSlotAvailable: 'Next slot available',
  languageFlexible: 'Language flexible',
} as const;

export function consumerProviderAvailabilityLabel(
  provider: Pick<HopeHubProvider, 'quickTalkAvailable' | 'liveStatus' | 'sessionTypes'>,
): string {
  if (provider.quickTalkAvailable) return CONSUMER_AVAILABILITY_COPY.liveNow;
  if (provider.liveStatus === 'ONLINE') return CONSUMER_AVAILABILITY_COPY.usuallyRepliesSoon;
  const sessions = (provider.sessionTypes || []).join(' ').toLowerCase();
  if (/evening|night|after work/.test(sessions)) {
    return CONSUMER_AVAILABILITY_COPY.usuallyAvailableEvenings;
  }
  return CONSUMER_AVAILABILITY_COPY.nextSlotAvailable;
}

export function consumerProviderAvailabilityClass(
  provider: Pick<HopeHubProvider, 'quickTalkAvailable' | 'liveStatus'>,
): string {
  if (provider.quickTalkAvailable) return 'hope-status hope-status--live';
  if (provider.liveStatus === 'ONLINE') return 'hope-status hope-status--online';
  return 'hope-status hope-status--wait';
}

export function consumerProviderLiveLabel(provider: Pick<HopeHubProvider, 'wentLiveAt'>): string {
  const wentLiveAt = provider.wentLiveAt ? new Date(provider.wentLiveAt).getTime() : 0;
  if (!wentLiveAt || Number.isNaN(wentLiveAt)) return CONSUMER_AVAILABILITY_COPY.onlineNow;
  const minutes = Math.max(0, Math.floor((Date.now() - wentLiveAt) / 60_000));
  if (minutes < 1) return CONSUMER_AVAILABILITY_COPY.onlineJustNow;
  if (minutes < 60) return `Online ${minutes} min`;
  return CONSUMER_AVAILABILITY_COPY.onlineToday;
}
