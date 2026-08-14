import { PUBLIC_STUN_SERVERS } from './online-doctor.constants.js';
import { createHmac } from 'node:crypto';

export type IceServerConfig = { urls: string | string[]; username?: string; credential?: string };

const DEFAULT_TURN_TTL_SECONDS = 60 * 60;

function splitCsv(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function turnUrls(): string[] {
  return splitCsv(process.env.TURN_URLS || process.env.TURN_URL);
}

function turnTtlSeconds(): number {
  const parsed = Number(process.env.TURN_TTL_SECONDS || '');
  if (!Number.isFinite(parsed) || parsed < 60) return DEFAULT_TURN_TTL_SECONDS;
  return Math.min(parsed, 24 * 60 * 60);
}

function temporaryTurnCredentials() {
  const sharedSecret = process.env.TURN_SHARED_SECRET?.trim();
  if (!sharedSecret) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + turnTtlSeconds();
  const usernamePrefix = process.env.TURN_USERNAME_PREFIX?.trim() || 'hopehub';
  const username = `${expiresAt}:${usernamePrefix}`;
  const credential = createHmac('sha1', sharedSecret).update(username).digest('base64');
  return { username, credential };
}

export function getPublicIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [...PUBLIC_STUN_SERVERS];

  const urls = turnUrls();
  if (!urls.length) return servers;

  const temporary = temporaryTurnCredentials();
  if (temporary) {
    servers.push({ urls, ...temporary });
    return servers;
  }

  const turnUser = process.env.TURN_USERNAME?.trim();
  const turnCred = process.env.TURN_CREDENTIAL?.trim();
  if (turnUser && turnCred) {
    servers.push({ urls, username: turnUser, credential: turnCred });
  }

  return servers;
}

export function getRtcConfigurationStatus() {
  const urls = turnUrls();
  const normalized = urls.map((url) => url.toLowerCase());
  return {
    stunConfigured: PUBLIC_STUN_SERVERS.length > 0,
    turnConfigured:
      urls.length > 0 &&
      Boolean(
        temporaryTurnCredentials() ||
        (process.env.TURN_USERNAME?.trim() && process.env.TURN_CREDENTIAL?.trim())
      ),
    transports: {
      udp: normalized.some((url) => !url.includes('transport=') || url.includes('transport=udp')),
      tcp: normalized.some((url) => url.includes('transport=tcp')),
      tls443: normalized.some((url) => url.startsWith('turns:') && /:443(?:\?|$)/.test(url))
    },
    credentialMode: process.env.TURN_SHARED_SECRET?.trim()
      ? 'temporary'
      : process.env.TURN_USERNAME?.trim() && process.env.TURN_CREDENTIAL?.trim()
        ? 'static'
        : 'none'
  };
}
