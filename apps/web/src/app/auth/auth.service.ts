import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { catchError, firstValueFrom, from, map, switchMap, tap, throwError } from 'rxjs';
import { type Role, type User } from '../interfaces';
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

  patientLogin(payload: { mobile: string; otp: string; name?: string }) {
    const body: { mobile: string; otp: string; name?: string } = {
      mobile: payload.mobile,
      otp: payload.otp
    };
    const trimmed = payload.name?.trim();
    if (trimmed && trimmed.length >= 2) {
      body.name = trimmed;
    }
    return from(
      firstValueFrom(this.http.post<AuthResponse>(`${this.apiBase}/auth/patient-login`, body))
    ).pipe(
      tap((response: AuthResponse) => this.persistSession(response))
    );
  }

  patientPasswordLogin(payload: { identifier: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.apiBase}/auth/patient-password-login`, payload).pipe(
      tap((response) => this.persistSession(response)),
      catchError((err: HttpErrorResponse) => {
        const code =
          err.error && typeof err.error === 'object' && 'code' in err.error
            ? (err.error as { code?: string }).code
            : undefined;
        if (err.status === 401 && code === 'PASSWORD_NOT_SET') {
          return from(this.supabaseAuth.signInPatientWithPassword(payload.identifier, payload.password)).pipe(
            switchMap((user: User) => this.exchangeSupabaseSession(user))
          );
        }
        return throwError(() => err);
      })
    );
  }

  staffLogin(payload: { email: string; password: string }) {
    return from(
      firstValueFrom(this.http.post<AuthResponse>(`${this.apiBase}/auth/staff-login`, payload))
    ).pipe(
      tap((response: AuthResponse) => this.persistSession(response))
    );
  }

  staffGoogleLogin(idToken: string) {
    return this.http.post<AuthResponse>(`${this.apiBase}/auth/google-staff`, { idToken }).pipe(
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

  /**
   * Sets or updates the clinic account password (Prisma). Optional: syncs Supabase password when a session exists.
   * When you already have a password, pass currentPassword.
   */
  patientUpdatePassword(payload: { newPassword: string; currentPassword?: string }) {
    const token = this.token;
    if (!token) {
      return throwError(() => new Error('Not signed in.'));
    }
    return this.http
      .post<{ ok: boolean }>(`${this.apiBase}/patient/account/password`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .pipe(
        switchMap(() =>
          from(
            (async () => {
              const { data } = await supabase.auth.getSession();
              if (data.session) {
                const { error } = await supabase.auth.updateUser({ password: payload.newPassword });
                if (error) {
                  console.warn('[auth] Supabase password sync skipped:', error.message);
                }
              }
              try {
                await this.tryExchangeSupabaseSession();
              } catch {
                // ignore
              }
            })()
          )
        )
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
