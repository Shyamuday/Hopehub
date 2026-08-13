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
  private heartbeatInFlight = false;
  private recoveryListenersAttached = false;

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.recoverRealtimeConnection();
  };

  private readonly handleBrowserOnline = () => this.recoverRealtimeConnection();

  readonly profile = signal<OnlineDoctorProfile | null>(null);
  readonly realtimeConnected = signal(false);
  readonly heartbeatHealthy = signal(false);
  readonly lastHeartbeatAt = signal<Date | null>(null);

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
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      this.disconnectRealtime();
      return;
    }

    this.stopTransport();
    this.socket = io(this.apiBase, { auth: { token }, transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => {
      this.realtimeConnected.set(true);
      void this.sendHeartbeat();
    });
    this.socket.on('disconnect', () => this.realtimeConnected.set(false));
    this.socket.on('connect_error', () => this.realtimeConnected.set(false));

    this.attachRecoveryListeners();
    void this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => void this.sendHeartbeat(), 30_000);
  }

  disconnectRealtime() {
    this.stopTransport();
    this.detachRecoveryListeners();
    this.heartbeatHealthy.set(false);
    this.lastHeartbeatAt.set(null);
  }

  private stopTransport() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.realtimeConnected.set(false);
    this.heartbeatInFlight = false;
  }

  private async sendHeartbeat() {
    if (this.heartbeatInFlight) return;
    this.heartbeatInFlight = true;
    this.socket?.emit('doctor:heartbeat');
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}${API_PATHS.DOCTOR.ONLINE_HEARTBEAT}`, {}),
      );
      this.lastHeartbeatAt.set(new Date());
      this.heartbeatHealthy.set(true);
    } catch {
      this.heartbeatHealthy.set(false);
    } finally {
      this.heartbeatInFlight = false;
    }
  }

  private recoverRealtimeConnection() {
    if (!this.socket) return;
    if (!this.socket.connected) this.socket.connect();
    void this.sendHeartbeat();
  }

  private attachRecoveryListeners() {
    if (this.recoveryListenersAttached || typeof window === 'undefined') return;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('online', this.handleBrowserOnline);
    this.recoveryListenersAttached = true;
  }

  private detachRecoveryListeners() {
    if (!this.recoveryListenersAttached || typeof window === 'undefined') return;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleBrowserOnline);
    this.recoveryListenersAttached = false;
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

  declineInstantConsultation(consultationId: string, reason?: string) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; status: string }>(
        `${this.apiBase}${API_PATHS.DOCTOR.DECLINE_INSTANT_CONSULTATION(consultationId)}`,
        { reason },
      ),
    );
  }

  acceptInstantConsultation(consultationId: string) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; status: string }>(
        `${this.apiBase}${API_PATHS.DOCTOR.ACCEPT_INSTANT_CONSULTATION(consultationId)}`,
        {},
      ),
    );
  }

  ngOnDestroy() {
    this.disconnectRealtime();
  }
}
