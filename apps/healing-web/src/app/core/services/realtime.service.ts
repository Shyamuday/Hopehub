import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const SOCKET_TRANSPORTS = ['websocket', 'polling'] as const;
const SUBSCRIBE_CONSULTATION = 'subscribe:consultation';

@Injectable({ providedIn: 'root' })
export class HopeHubRealtimeService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private socket: Socket | null = null;

  connect(): Socket | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const token = this.auth.getToken();
    if (!token) return null;

    if (this.socket?.connected || this.socket?.active) {
      return this.socket;
    }

    this.socket?.disconnect();
    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: [...SOCKET_TRANSPORTS],
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  subscribeConsultation(consultationId: string): void {
    this.connect()?.emit(SUBSCRIBE_CONSULTATION, consultationId);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
