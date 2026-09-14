type TelegramCallLink = {
  groupUrl: string;
  appUrl?: string;
};

/** Parse a Telegram public-group URL without inventing an active-call link. */
function telegramCallLink(joinUrl: string): TelegramCallLink | undefined {
  const trimmed = joinUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (!/^https?:$/.test(url.protocol) || url.hostname.toLowerCase() !== 't.me') {
      return undefined;
    }

    const username = url.pathname.replace(/^\/+|\/+$/g, '');
    // A public group/channel username has one path segment. Do not rewrite a
    // private invite, a post URL, or another Telegram deep-link.
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) return undefined;

    const parameter = url.searchParams.has('videochat')
      ? 'videochat'
      : url.searchParams.has('voicechat')
        ? 'voicechat'
        : undefined;
    const inviteHash = parameter ? url.searchParams.get(parameter)?.trim() || '' : '';
    return {
      groupUrl: `https://t.me/${username}`,
      ...(parameter && inviteHash
        ? {
            appUrl: `tg://resolve?domain=${encodeURIComponent(username)}&videochat=${encodeURIComponent(inviteHash)}`
          }
        : {})
    };
  } catch {
    return undefined;
  }
}

/**
 * Only an invite exported for the exact active call is labelled Join VC.
 * Generic `?videochat` links proved unreliable and are no longer fabricated.
 */
export function telegramGroupCallButton(joinUrl: string, isLive: boolean) {
  const trimmed = joinUrl.trim();
  const telegramLink = telegramCallLink(trimmed);
  if (isLive && telegramLink?.appUrl) {
    return { text: 'Join VC', url: telegramLink.appUrl };
  }
  if (isLive && !telegramLink) {
    return { text: 'Join VC', url: trimmed };
  }
  return { text: 'Open group', url: telegramLink?.groupUrl || trimmed };
}

/** Prefer the invite exported for the exact active call over stored/group fallbacks. */
export function telegramLiveVoiceJoinUrl(
  activeCallInvite: string | undefined,
  eventJoinUrl: string | undefined,
  groupJoinUrl: string | undefined
) {
  return activeCallInvite?.trim() || eventJoinUrl?.trim() || groupJoinUrl?.trim() || '';
}
