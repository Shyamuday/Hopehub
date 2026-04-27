import { Injectable, computed, inject } from '@angular/core';
import { from, map, tap } from 'rxjs';
import { Role, User } from '../models';
import { SupabaseAuthService } from './supabase-auth.service';

type AuthResponse = {
  token: string;
  user: User;
};

const tokenKey = 'clinic_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabaseAuth = inject(SupabaseAuthService);

  readonly user = this.supabaseAuth.user.asReadonly();
  readonly isLoggedIn = computed(() => Boolean(this.user()));

  constructor() {
    void this.supabaseAuth.bootstrapSession();
  }

  bootstrapSession() {
    return this.supabaseAuth.bootstrapSession();
  }

  get token() {
    return localStorage.getItem(tokenKey);
  }

  requestOtp(mobile: string) {
    return from(this.supabaseAuth.signInPatientWithOtp(mobile)).pipe(
      map(() => ({ devOtp: 'Check SMS from Supabase' }))
    );
  }

  patientLogin(payload: { name: string; mobile: string; otp: string }) {
    return from(this.supabaseAuth.verifyPatientOtp(payload.name, payload.mobile, payload.otp)).pipe(
      map((user: User): AuthResponse => ({ token: '', user })),
      tap((response: AuthResponse) => this.persistSession(response))
    );
  }

  staffLogin(payload: { email: string; password: string }) {
    return from(this.supabaseAuth.signInWithEmail(payload.email, payload.password)).pipe(
      map((user: User): AuthResponse => ({ token: '', user })),
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
    localStorage.setItem(tokenKey, response.token);
  }
}
