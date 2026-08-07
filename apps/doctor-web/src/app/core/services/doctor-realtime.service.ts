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
};

export type ConsultationUpdatedPayload = {
  consultationId: string;
  status?: string;
};

@Injectable({ providedIn: 'root' })
export class DoctorRealtimeService implements OnDestroy {
  private socket: Socket | null = null;
  private onAssigned: ((payload: ConsultationAssignedPayload) => void) | null = null;
  private onMessage: ((message: unknown) => void) | null = null;
  private onUpdated: ((payload: ConsultationUpdatedPayload) => void) | null = null;

  connect(
    handler?: (payload: ConsultationAssignedPayload) => void,
    onMessage?: (message: unknown) => void,
    onUpdated?: (payload: ConsultationUpdatedPayload) => void,
  ): void {
    if (handler) this.onAssigned = handler;
    if (onMessage) this.onMessage = onMessage;
    if (onUpdated) this.onUpdated = onUpdated;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    if (this.socket?.connected || this.socket?.active) return;

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on(SOCKET_EVENTS.CONSULTATION_ASSIGNED, (payload: ConsultationAssignedPayload) => {
      this.onAssigned?.(payload);
    });
    this.socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message: unknown) => {
      this.onMessage?.(message);
    });
    this.socket.on(SOCKET_EVENTS.CONSULTATION_UPDATED, (payload: ConsultationUpdatedPayload) => {
      this.onUpdated?.(payload);
    });
  }

  subscribeConsultation(consultationId: string) {
    this.socket?.emit(SOCKET_EVENTS.SUBSCRIBE_CONSULTATION, consultationId);
  }

  clearConsultationUpdatedHandler(handler: (payload: ConsultationUpdatedPayload) => void): void {
    if (this.onUpdated === handler) this.onUpdated = null;
  }

  getSocket() {
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.onAssigned = null;
    this.onMessage = null;
    this.onUpdated = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
