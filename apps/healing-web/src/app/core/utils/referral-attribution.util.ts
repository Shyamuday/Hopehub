const REFERRAL_ATTRIBUTION_KEY = 'hh_referral_code';

export function normalizeReferralAttribution(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 32);
}

export function captureReferralAttribution(value: string | null | undefined): string | undefined {
  const code = normalizeReferralAttribution(value);
  if (code && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REFERRAL_ATTRIBUTION_KEY, code);
    } catch {
      return code;
    }
  }
  return code || readReferralAttribution();
}

export function readReferralAttribution(): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    return (
      normalizeReferralAttribution(localStorage.getItem(REFERRAL_ATTRIBUTION_KEY)) || undefined
    );
  } catch {
    return undefined;
  }
}

export function clearReferralAttribution(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(REFERRAL_ATTRIBUTION_KEY);
    } catch {
      // Storage may be disabled; there is nothing else to clear.
    }
  }
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.has('ref')) {
      url.searchParams.delete('ref');
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }
}
