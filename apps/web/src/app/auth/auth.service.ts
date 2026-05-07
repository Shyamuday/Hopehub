import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, from, map, switchMap, tap } from 'rxjs';
import { Role, User } from '../models';
import { SupabaseAuthService } from './supabase-auth.service';
import { supabase } from '../supabase.client';
import { environment } from '../../environments/environment';

type AuthResponse = {
  token: string;
  user: User;
};

const tokenKey = 'clinic_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabaseAuth = inject(SupabaseAuthService);
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  readonly user = this.supabaseAuth.user.asReadonly();
  readonly isLoggedIn = computed(() => Boolean(this.user()));

  constructor() {
    void this.bootstrapSession();
  }

  async bootstrapSession() {
    const token = this.token;
    if (token) {
      try {
        const response = await firstValueFrom(
          this.http.get<{ user: User }>(`${this.apiBase}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
        this.supabaseAuth.setAuthenticatedUser(response.user);
        return response.user;
      } catch {
        localStorage.removeItem(tokenKey);
        this.supabaseAuth.setAuthenticatedUser(null);
      }
    }

    const user = await this.supabaseAuth.bootstrapSession();
    if (user) {
      try {
        await this.tryExchangeSupabaseSession();
      } catch {
        // exchange is best-effort; Supabase-only session still works for public content
      }
    }

    return user;
  }

  private async tryExchangeSupabaseSession(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiBase}/auth/supabase-exchange`, { supabaseToken: accessToken })
    );
    this.persistSession(response);
  }

  private exchangeSupabaseSession(user: User) {
    return from(supabase.auth.getSession()).pipe(
      switchMap(({ data }) => {
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          const response: AuthResponse = { token: '', user };
          this.persistSession(response);
          return [response];
        }

        return this.http.post<AuthResponse>(`${this.apiBase}/auth/supabase-exchange`, { supabaseToken: accessToken }).pipe(
          tap((response) => this.persistSession(response))
        );
      })
    );
  }

  get token() {
    return localStorage.getItem(tokenKey);
  }

  requestOtp(mobile: string) {
    return from(
      firstValueFrom(this.http.post<{ devOtp?: string }>(`${this.apiBase}/auth/request-otp`, { mobile }))
    ).pipe(map((response) => ({ devOtp: response.devOtp || 'Check SMS from backend' })));
  }

  patientLogin(payload: { name: string; mobile: string; otp: string }) {
    return from(
      firstValueFrom(this.http.post<AuthResponse>(`${this.apiBase}/auth/patient-login`, payload))
    ).pipe(
      tap((response: AuthResponse) => this.persistSession(response))
    );
  }

  patientPasswordLogin(payload: { identifier: string; password: string }) {
    return from(this.supabaseAuth.signInPatientWithPassword(payload.identifier, payload.password)).pipe(
      switchMap((user: User) => this.exchangeSupabaseSession(user))
    );
  }

  staffLogin(payload: { email: string; password: string }) {
    return from(
      firstValueFrom(this.http.post<AuthResponse>(`${this.apiBase}/auth/staff-login`, payload))
    ).pipe(
      tap((response: AuthResponse) => this.persistSession(response))
    );
  }

  forgotPassword(email: string) {
    return from(this.supabaseAuth.forgotPassword(email)).pipe(
      map(() => ({ message: 'Password reset link sent if the account exists.', resetToken: undefined }))
    );
  }

  resetPassword(payload: { token: string; password: string }) {
    return from(this.supabaseAuth.updatePassword(payload.password)).pipe(
      map((user: User | null): AuthResponse => {
        if (!user) {
          throw new Error('No active Supabase reset session found.');
        }

        return { token: '', user };
      }),
      tap((response: AuthResponse) => this.persistSession(response))
    );
  }

  googleLogin() {
    return from(this.supabaseAuth.signInWithGoogle()).pipe(
      map(() => {
        return { message: 'Redirecting to Google...' };
      })
    );
  }

  logout() {
    localStorage.removeItem(tokenKey);
    void this.supabaseAuth.logout();
  }

  dashboardFor(role: Role) {
    if (role === 'ADMIN') {
      return '/admin/dashboard';
    }

    if (role === 'DOCTOR') {
      return '/doctor/dashboard';
    }

    return '/patient/dashboard';
  }

  private persistSession(response: AuthResponse) {
    if (response.token) {
      localStorage.setItem(tokenKey, response.token);
    }
    this.supabaseAuth.setAuthenticatedUser(response.user);
  }
}
