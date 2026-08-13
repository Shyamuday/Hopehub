import { HttpClient } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';
import { AUTH_TOKEN_KEY } from '../constants/auth.constants';
import type { HomeopathicDoctorType } from '../constants/doctor-types.constants';
import type { ProviderSessionMode } from '@hopehub/contracts';

export type OnlineDoctorProfile = {
  userId: string;
  name: string;
  category: 'GENERALIST' | 'SPECIALIST';
  specialtyDiseaseIds: string[];
  liveStatus: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'ON_CALL';
  acceptsChat: boolean;
  acceptsVoiceCall: boolean;
  acceptsVideoCall: boolean;
  allowedModes: ProviderSessionMode[];
  specialty: string;
  doctorType?: HomeopathicDoctorType;
  doctorTypeLabel?: string;
  mentalHealthProfile?: {
    careTeamType?: string | null;
    careTeamTypes?: string[] | null;
  } | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  focusAreas?: string[];
  isAvailable?: boolean;
  wentLiveAt?: string | null;
};

@Injectable({ providedIn: 'root' })
export class OnlineDoctorService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private socket: Socket | null = null;

  readonly profile = signal<OnlineDoctorProfile | null>(null);

  loadProfile() {
    return firstValueFrom(
      this.http.get<{
        profile: OnlineDoctorProfile;
        diseases: Array<{ id: string; name: string }>;
      }>(`${this.apiBase}${API_PATHS.DOCTOR.ONLINE_PROFILE}`),
    );
  }

  saveProfile(
    payload: Partial<OnlineDoctorProfile> & { enabled?: boolean; specialtyDiseaseIds?: string[] },
  ) {
    return firstValueFrom(
      this.http.put<{ profile: OnlineDoctorProfile }>(
        `${this.apiBase}${API_PATHS.DOCTOR.ONLINE_PROFILE}`,
        payload,
      ),
    );
  }

  setLiveStatus(payload: {
    liveStatus: OnlineDoctorProfile['liveStatus'];
    acceptsChat?: boolean;
    acceptsVoiceCall?: boolean;
    acceptsVideoCall?: boolean;
  }) {
    return firstValueFrom(
      this.http.put<{ profile: OnlineDoctorProfile }>(
        `${this.apiBase}${API_PATHS.DOCTOR.ONLINE_STATUS}`,
        payload,
      ),
    );
  }

  connectRealtime() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    this.socket?.disconnect();
    this.socket = io(this.apiBase, { auth: { token }, transports: ['websocket', 'polling'] });
    this.heartbeatTimer = setInterval(() => {
      this.socket?.emit('doctor:heartbeat');
      void firstValueFrom(
        this.http.post(`${this.apiBase}${API_PATHS.DOCTOR.ONLINE_HEARTBEAT}`, {}),
      ).catch(() => undefined);
    }, 30_000);
  }

  disconnectRealtime() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.socket?.disconnect();
    this.socket = null;
  }

  get socketRef() {
    return this.socket;
  }

  loadInstantConsultations() {
    return firstValueFrom(
      this.http.get<{
        consultations: Array<{
          id: string;
          status: string;
          patient: { id: string; name: string; patientCode?: string | null };
          disease: { id: string; name: string };
          updatedAt: string;
        }>;
      }>(`${this.apiBase}${API_PATHS.DOCTOR.INSTANT_CONSULTATIONS}`),
    );
  }

  ngOnDestroy() {
    this.disconnectRealtime();
  }
}
