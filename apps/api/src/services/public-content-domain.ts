import { ProviderDomain } from '@prisma/client';

export const PUBLIC_CONTENT_DOMAINS = [ProviderDomain.HOMEOPATHY, ProviderDomain.HOPE_HUB] as const;

export function parsePublicContentDomain(
  value: unknown,
  fallback = ProviderDomain.HOMEOPATHY
): ProviderDomain {
  if (typeof value !== 'string') return fallback;
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
  return PUBLIC_CONTENT_DOMAINS.includes(normalized as ProviderDomain)
    ? (normalized as ProviderDomain)
    : fallback;
}

export function publicContentDomainForPath(path: string): ProviderDomain {
  return path.toLowerCase().startsWith('/hope-hub/')
    ? ProviderDomain.HOPE_HUB
    : ProviderDomain.HOMEOPATHY;
}

export function normalizePublicDomains(values: ProviderDomain[]): ProviderDomain[] {
  return [...new Set(values)].filter((value) => PUBLIC_CONTENT_DOMAINS.includes(value));
}
