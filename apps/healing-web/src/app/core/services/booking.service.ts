import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { IceServerConfig } from '../../shared/components/consultation-call/webrtc-call.types';

export type HopeHubBookingPayload = {
  serviceName: string;
  servicePriceInPaise?: number;
  message?: string;
  appointmentDate: string;
  appointmentTime: string;
  consultantName?: string;
  consultantPhone?: string;
  sessionDuration?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  preferredContact?: string;
  urgencyLevel?: string;
  preferredTime?: string;
  preferAnonymousTelegram?: boolean;
  entryPage?: string;
};

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  createBooking(payload: HopeHubBookingPayload): Observable<{ consultation: any }> {
    return this.http.post<{ consultation: any }>(`${this.apiUrl}/hope-hub/bookings`, payload);
  }

  dashboard(): Observable<{ consultations: any[]; leads: any[] }> {
    return this.http.get<{ consultations: any[]; leads: any[] }>(
      `${this.apiUrl}/hope-hub/dashboard`,
    );
  }

  iceServers(): Observable<{ iceServers: IceServerConfig[] }> {
    return this.http.get<{ iceServers: IceServerConfig[] }>(`${this.apiUrl}/rtc/ice-servers`);
  }

  slots(date: string): Observable<{
    date: string;
    slots: Array<{
      time: string;
      period: 'morning' | 'afternoon' | 'evening';
      available: boolean;
      booked: boolean;
    }>;
  }> {
    return this.http.get<{
      date: string;
      slots: Array<{
        time: string;
        period: 'morning' | 'afternoon' | 'evening';
        available: boolean;
        booked: boolean;
      }>;
    }>(`${this.apiUrl}/hope-hub/slots?date=${encodeURIComponent(date)}`);
  }
}
