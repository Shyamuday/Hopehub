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
  providerId?: string;
  entryPage?: string;
};

export type HopeHubProvider = {
  id: string;
  userId: string;
  name: string;
  profileImageUrl?: string | null;
  specialty?: string | null;
  designation?: string | null;
  department?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  focusAreas: string[];
  qualifications?: string[];
  licenseNumber?: string | null;
  licenseCouncil?: string | null;
  languages?: string[];
  modalities?: string[];
  sessionTypes?: string[];
  ageGroups?: string[];
  concernsHandled?: string[];
  introSessionTitle?: string | null;
  counsellingApproach?: string | null;
  safetyEscalationNote?: string | null;
  acceptsHighRiskCases?: boolean;
  sessionFeeInPaise?: number;
  sessionDurationMinutes?: number;
};

export type HopeHubProviderResponse = {
  providers: HopeHubProvider[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

  providers(
    params: { page?: number; pageSize?: number; q?: string } = {},
  ): Observable<HopeHubProviderResponse> {
    const searchParams = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      q: params.q ?? '',
    });
    return this.http.get<HopeHubProviderResponse>(
      `${this.apiUrl}/hope-hub/providers?${searchParams.toString()}`,
    );
  }

  provider(id: string): Observable<{ provider: HopeHubProvider }> {
    return this.http.get<{ provider: HopeHubProvider }>(
      `${this.apiUrl}/hope-hub/providers/${encodeURIComponent(id)}`,
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
