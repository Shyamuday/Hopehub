import type { Server as SocketIoServer } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIXES } from '../constants/socket.constants.js';

let liveGroupSocket: SocketIoServer | null = null;

export function setHopeHubLiveGroupSocket(io: SocketIoServer) {
  liveGroupSocket = io;
}

export function emitHopeHubLiveGroupMessage(groupId: string, message: unknown) {
  liveGroupSocket
    ?.to(`${SOCKET_ROOM_PREFIXES.HOPE_HUB_GROUP}${groupId}`)
    .emit(SOCKET_EVENTS.HOPE_HUB_GROUP_MESSAGE_NEW, message);
}
