/**
 * Converts a public Telegram group URL into Telegram's native video-chat
 * deep-link. Opening this link takes a member straight to the active group
 * call join screen instead of merely opening the group conversation.
 *
 * Private invite links and non-Telegram meeting links are intentionally left
 * untouched: Telegram does not support an equivalent direct-call link for a
 * private group, and rewriting a third-party meeting URL would be incorrect.
 */
export function telegramVideoChatJoinUrl(joinUrl: string): string {
  const trimmed = joinUrl.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!/^https?:$/.test(url.protocol) || url.hostname.toLowerCase() !== 't.me') {
      return trimmed;
    }

    const username = url.pathname.replace(/^\/+|\/+$/g, '');
    // A public group/channel username has one path segment. Do not rewrite a
    // private invite, a post URL, or another Telegram deep-link.
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) return trimmed;

    if (url.searchParams.has('videochat') || url.searchParams.has('voicechat')) {
      return trimmed;
    }

    url.search = '';
    url.hash = '';
    url.searchParams.set('videochat', '');
    // URL serialises an empty query value as `?videochat=`. Telegram accepts
    // it, but its documented, cleaner spelling is `?videochat`.
    return url.toString().replace('?videochat=', '?videochat');
  } catch {
    return trimmed;
  }
}
