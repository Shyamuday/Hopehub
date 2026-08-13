import { inject, Injectable, OnDestroy } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../constants/auth.constants';
import { SOCKET_EVENTS } from '../constants/socket.constants';

export type ConsultationAssignedPayload = {
  consultationId: string;
  patientCode?: string | null;
  patientName?: string | null;
  diseaseName?: string | null;
  status?: string;
  consultationMode?: 'CLINIC_QUEUE' | 'INSTANT_ONLINE';
  sessionMode?: 'chat' | 'voice' | 'video';
};

export type ConsultationUpdatedPayload = {
  consultationId: string;
  status?: string;
};

@Injectable({ providedIn: 'root' })
export class DoctorRealtimeService implements OnDestroy {
  private socket: Socket | null = null;
  private socketToken = '';
  private readonly assignedHandlers = new Set<(payload: ConsultationAssignedPayload) => void>();
  private readonly messageHandlers = new Set<(message: unknown) => void>();
  private readonly updatedHandlers = new Set<(payload: ConsultationUpdatedPayload) => void>();
  private readonly consultationSubscriptions = new Map<string, number>();

  connect(
    handler?: (payload: ConsultationAssignedPayload) => void,
    onMessage?: (message: unknown) => void,
    onUpdated?: (payload: ConsultationUpdatedPayload) => void,
  ): void {
    if (handler) this.assignedHandlers.add(handler);
    if (onMessage) this.messageHandlers.add(onMessage);
    if (onUpdated) this.updatedHandlers.add(onUpdated);
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    if ((this.socket?.connected || this.socket?.active) && this.socketToken === token) return;

    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socketToken = token;
    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => this.restoreConsultationSubscriptions());
    this.socket.on(SOCKET_EVENTS.CONSULTATION_ASSIGNED, (payload: ConsultationAssignedPayload) => {
      this.assignedHandlers.forEach((callback) => callback(payload));
    });
    this.socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message: unknown) => {
      this.messageHandlers.forEach((callback) => callback(message));
    });
    this.socket.on(SOCKET_EVENTS.CONSULTATION_UPDATED, (payload: ConsultationUpdatedPayload) => {
      this.updatedHandlers.forEach((callback) => callback(payload));
    });
  }

  subscribeConsultation(consultationId: string) {
    if (!consultationId) return;
    const currentCount = this.consultationSubscriptions.get(consultationId) ?? 0;
    this.consultationSubscriptions.set(consultationId, currentCount + 1);
    if (currentCount === 0 && this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.SUBSCRIBE_CONSULTATION, consultationId);
    }
  }

  unsubscribeConsultation(consultationId: string) {
    const currentCount = this.consultationSubscriptions.get(consultationId) ?? 0;
    if (currentCount <= 1) {
      this.consultationSubscriptions.delete(consultationId);
      return;
    }
    this.consultationSubscriptions.set(consultationId, currentCount - 1);
  }

  clearConsultationUpdatedHandler(handler: (payload: ConsultationUpdatedPayload) => void): void {
    this.updatedHandlers.delete(handler);
  }

  clearMessageHandler(handler: (message: unknown) => void): void {
    this.messageHandlers.delete(handler);
  }

  getSocket() {
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.socketToken = '';
    this.assignedHandlers.clear();
    this.messageHandlers.clear();
    this.updatedHandlers.clear();
    this.consultationSubscriptions.clear();
  }

  private restoreConsultationSubscriptions(): void {
    if (!this.socket?.connected) return;
    this.consultationSubscriptions.forEach((_count, consultationId) => {
      this.socket?.emit(SOCKET_EVENTS.SUBSCRIBE_CONSULTATION, consultationId);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
