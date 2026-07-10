import { computed, inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, from, tap } from 'rxjs';
import { AUTH_PATHS, AUTH_TOKEN_KEY, ROLE_DASHBOARD_PATHS } from '../core/constants/auth.constants';
import { Role, User, type PatientSelectionResponse } from '../models';
import { PatientAuthService } from './patient-auth.service';
import { environment } from '../../environments/environment';

type AuthResponse = {
  token: string;
  user: User;
};

@Service()
export class AuthService {
  private readonly patientAuth = inject(PatientAuthService);
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  readonly user = this.patientAuth.user.asReadonly();
  readonly isLoggedIn = computed(() => Boolean(this.user()));

  constructor() {
    void this.bootstrapSession();
  }

  async bootstrapSession() {
    const token = this.token;
    if (!token) {
      this.patientAuth.setAuthenticatedUser(null);
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ user: User }>(`${this.apiBase}${AUTH_PATHS.ME}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.patientAuth.setAuthenticatedUser(response.user);
      return response.user;
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      this.patientAuth.setAuthenticatedUser(null);
      return null;
    }
  }

  get token() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  requestOtp(
    email: string,
    lead?: {
      source: 'HOME_BOOKING' | 'PROMO_POPUP';
      visitorName?: string;
      visitorKey?: string;
      entryPage?: string;
    },
  ) {
    return this.http.post<{ devOtp?: string }>(`${this.apiBase}${AUTH_PATHS.REQUEST_OTP}`, {
      email,
      ...(lead
        ? {
            leadSource: lead.source,
            visitorName: lead.visitorName,
            visitorKey: lead.visitorKey,
            entryPage:
              lead.entryPage ??
              (typeof window !== 'undefined' ? window.location.pathname : undefined),
          }
        : {}),
    });
  }

  patientLogin(payload: { email: string; otp: string; name?: string; referralCode?: string }) {
    return this.http
      .post<AuthResponse | PatientSelectionResponse>(
        `${this.apiBase}${AUTH_PATHS.PATIENT_LOGIN}`,
        payload,
      )
      .pipe(tap((response) => this.persistIfAuthenticated(response)));
  }

  patientLoginSelect(payload: { email: string; otp: string; patientId: string }) {
    return this.http
      .post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.PATIENT_LOGIN_SELECT}`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  patientPasswordLogin(payload: { identifier: string; password: string }) {
    return from(this.patientAuth.signInWithPassword(payload.identifier, payload.password)).pipe(
      tap((response) => this.persistIfAuthenticated(response)),
    );
  }

  patientPasswordLoginSelect(payload: { identifier: string; password: string; patientId: string }) {
    return from(
      this.patientAuth.signInWithPasswordSelect(
        payload.identifier,
        payload.password,
        payload.patientId,
      ),
    ).pipe(tap((response) => this.persistSession(response)));
  }

  patientRegister(payload: { name: string; email: string; password: string }) {
    return from(this.patientAuth.register(payload)).pipe(
      tap((response) => this.persistSession(response)),
    );
  }

  googleLogin(idToken: string) {
    return this.http
      .post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.GOOGLE}`, { idToken })
      .pipe(tap((response) => this.persistSession(response)));
  }

  forgotPassword(email: string) {
    return from(this.patientAuth.forgotPassword(email));
  }

  resetPassword(payload: { token: string; password: string }) {
    return from(this.patientAuth.resetPassword(payload.token, payload.password)).pipe(
      tap((response) => this.persistSession(response)),
    );
  }

  applyDevSession(response: AuthResponse) {
    this.persistSession(response);
  }

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this.patientAuth.setAuthenticatedUser(null);
  }

  dashboardFor(role: Role) {
    if (role === 'ADMIN') return ROLE_DASHBOARD_PATHS.ADMIN;
    if (role === 'DOCTOR') return ROLE_DASHBOARD_PATHS.DOCTOR;
    return ROLE_DASHBOARD_PATHS.PATIENT;
  }

  private persistIfAuthenticated(response: AuthResponse | PatientSelectionResponse) {
    if ('token' in response) {
      this.persistSession(response);
    }
  }

  private persistSession(response: AuthResponse) {
    if (response.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    }

    this.patientAuth.setAuthenticatedUser(response.user);
  }
}
