import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const SOCKET_TRANSPORTS = ['websocket', 'polling'] as const;
const SUBSCRIBE_CONSULTATION = 'subscribe:consultation';
const SUBSCRIBE_HOPE_HUB_GROUP = 'subscribe:hopehub-group';
const HOPE_HUB_GROUP_TYPING = 'hopehub-group:typing';

@Injectable({ providedIn: 'root' })
export class HopeHubRealtimeService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private socket: Socket | null = null;
  private socketToken = '';
  private readonly consultationSubscriptions = new Set<string>();
  private readonly liveGroupSubscriptions = new Set<string>();

  connect(): Socket | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const token = this.auth.getToken();
    const socketIdentity = token || 'anonymous';

    if ((this.socket?.connected || this.socket?.active) && this.socketToken === socketIdentity) {
      return this.socket;
    }

    this.socket?.disconnect();
    this.socketToken = socketIdentity;
    this.socket = io(environment.apiUrl, {
      auth: token ? { token } : {},
      transports: [...SOCKET_TRANSPORTS],
    });
    this.socket.on('connect', () => this.restoreSubscriptions());

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  subscribeConsultation(consultationId: string): void {
    if (!consultationId) return;
    this.consultationSubscriptions.add(consultationId);
    const socket = this.connect();
    if (socket?.connected) socket.emit(SUBSCRIBE_CONSULTATION, consultationId);
  }

  unsubscribeConsultation(consultationId: string): void {
    this.consultationSubscriptions.delete(consultationId);
  }

  subscribeLiveGroup(groupId: string): void {
    if (!groupId) return;
    this.liveGroupSubscriptions.add(groupId);
    const socket = this.connect();
    if (socket?.connected) socket.emit(SUBSCRIBE_HOPE_HUB_GROUP, groupId);
  }

  unsubscribeLiveGroup(groupId: string): void {
    this.liveGroupSubscriptions.delete(groupId);
  }

  sendLiveGroupTyping(groupId: string, displayName: string, isTyping: boolean): void {
    this.connect()?.emit(HOPE_HUB_GROUP_TYPING, { groupId, displayName, isTyping });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.socketToken = '';
    this.consultationSubscriptions.clear();
    this.liveGroupSubscriptions.clear();
  }

  private restoreSubscriptions(): void {
    const socket = this.socket;
    if (!socket?.connected) return;
    this.consultationSubscriptions.forEach((id) => socket.emit(SUBSCRIBE_CONSULTATION, id));
    this.liveGroupSubscriptions.forEach((id) => socket.emit(SUBSCRIBE_HOPE_HUB_GROUP, id));
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
