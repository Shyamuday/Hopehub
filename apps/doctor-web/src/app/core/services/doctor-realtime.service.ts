import { inject, Injectable, OnDestroy } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../constants/auth.constants';

export type ConsultationAssignedPayload = {
  consultationId: string;
  patientCode?: string | null;
  patientName?: string | null;
  diseaseName?: string | null;
  status?: string;
};

@Injectable({ providedIn: 'root' })
export class DoctorRealtimeService implements OnDestroy {
  private socket: Socket | null = null;
  private onAssigned: ((payload: ConsultationAssignedPayload) => void) | null = null;

  connect(handler: (payload: ConsultationAssignedPayload) => void): void {
    this.onAssigned = handler;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    this.socket?.disconnect();
    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('consultation:assigned', (payload: ConsultationAssignedPayload) => {
      this.onAssigned?.(payload);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.onAssigned = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
