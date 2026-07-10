import { inject, signal, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AUTH_PATHS, ROLE_DASHBOARD_PATHS } from '../core/constants/auth.constants';
import { Role, User, type PatientSelectionResponse } from '../models';
import { environment } from '../../environments/environment';

type AuthResponse = { token: string; user: User };

@Service()
export class PatientAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  readonly user = signal<User | null>(null);

  setAuthenticatedUser(user: User | null) {
    this.user.set(user);
  }

  async register(payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.PATIENT_REGISTER}`, payload),
    );
  }

  async signInWithPassword(
    identifier: string,
    password: string,
  ): Promise<AuthResponse | PatientSelectionResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse | PatientSelectionResponse>(
        `${this.apiBase}${AUTH_PATHS.PATIENT_PASSWORD_LOGIN}`,
        {
          identifier,
          password,
        },
      ),
    );
  }

  async signInWithPasswordSelect(
    identifier: string,
    password: string,
    patientId: string,
  ): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.PATIENT_PASSWORD_SELECT}`, {
        identifier,
        password,
        patientId,
      }),
    );
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post<{ message: string }>(`${this.apiBase}${AUTH_PATHS.PATIENT_FORGOT_PASSWORD}`, {
        email,
      }),
    );
  }

  async resetPassword(token: string, password: string): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.PATIENT_RESET_PASSWORD}`, {
        token,
        password,
      }),
    );
  }

  dashboardFor(role: Role) {
    if (role === 'ADMIN') return ROLE_DASHBOARD_PATHS.ADMIN;
    if (role === 'DOCTOR') return ROLE_DASHBOARD_PATHS.DOCTOR;
    return ROLE_DASHBOARD_PATHS.PATIENT;
  }
}
