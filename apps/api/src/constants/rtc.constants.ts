import { PUBLIC_STUN_SERVERS } from './online-doctor.constants.js';

export type IceServerConfig = { urls: string | string[]; username?: string; credential?: string };

export function getPublicIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [...PUBLIC_STUN_SERVERS];

  const turnUrl = process.env.TURN_URL?.trim();
  const turnUser = process.env.TURN_USERNAME?.trim();
  const turnCred = process.env.TURN_CREDENTIAL?.trim();
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }

  return servers;
}
