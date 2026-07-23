import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordRequest,
  UpdateProfileRequest,
  AuthError,
  UserPreferences,
  ApiAuthResponse,
  PatientSelectionResponse,
} from '../models/auth.model';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'clinic_token';
const LEGACY_TOKEN_KEY = 'hh_patient_token';
const USER_KEY = 'hh_patient_user';
const PREFS_KEY = 'hh_patient_prefs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private isBrowser = isPlatformBrowser(this.platformId);
  private apiUrl = environment.apiUrl;

  private authStateSubject = new BehaviorSubject<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  public authState$ = this.authStateSubject.asObservable();
  public user$ = this.authState$.pipe(map((s) => s.user));
  public isAuthenticated$ = this.authState$.pipe(map((s) => s.isAuthenticated));
  public isLoading$ = this.authState$.pipe(map((s) => s.isLoading));

  constructor() {
    // Restore session from localStorage on startup (browser only)
    if (this.isBrowser) {
      void this.restoreSession();
    } else {
      this.updateState({ isLoading: false });
    }
  }

  // ── Session persistence ──────────────────────────────────────────────────

  private async restoreSession(): Promise<void> {
    try {
      const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
      const token = localStorage.getItem(TOKEN_KEY) || legacyToken;
      const raw = localStorage.getItem(USER_KEY);
      if (legacyToken && !localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(TOKEN_KEY, legacyToken);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      }
      if (token && raw) {
        const user: User = JSON.parse(raw);
        user.preferences = this.loadPreferences();
        this.updateState({ user, isAuthenticated: true, isLoading: false });
        return;
      }
      if (token) {
        await this.hydrateSessionFromApi(token);
        return;
      }
    } catch {
      // corrupted storage — clear it
      this.clearStorage();
    }
    this.updateState({ isLoading: false });
  }

  private saveSession(token: string, user: User): void {
    if (!this.isBrowser) return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private clearStorage(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PREFS_KEY);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  // ── Auth state helpers ───────────────────────────────────────────────────

  private updateState(patch: Partial<AuthState>): void {
    this.authStateSubject.next({ ...this.authStateSubject.value, ...patch });
  }

  private buildUser(apiUser: ApiAuthResponse['user']): User {
    return {
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      mobile: apiUser.mobile,
      patientCode: apiUser.patientCode,
      role: 'PATIENT',
      preferences: this.loadPreferences(),
    };
  }

  private async hydrateSessionFromApi(token: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.get<{ user: ApiAuthResponse['user'] }>(`${this.apiUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    const user = this.buildUser(resp.user);
    this.saveSession(token, user);
    this.updateState({ user, isAuthenticated: true, isLoading: false, error: null });
  }

  private applyAuthResponse(resp: ApiAuthResponse): User {
    const user = this.buildUser(resp.user);
    this.saveSession(resp.token, user);
    this.updateState({ user, isAuthenticated: true, isLoading: false, error: null });
    return user;
  }

  // ── Public auth methods ──────────────────────────────────────────────────

  async login(credentials: LoginCredentials): Promise<User> {
    this.updateState({ isLoading: true, error: null });
    try {
      const resp = await firstValueFrom(
        this.http.post<ApiAuthResponse | PatientSelectionResponse>(
          `${this.apiUrl}/auth/patient-login-password`,
          { identifier: credentials.email, password: credentials.password },
        ),
      );

      // Multiple patients found under the same email — rare edge case
      if ('requiresPatientSelection' in resp) {
        this.updateState({ isLoading: false });
        throw this.makeError(
          'MULTIPLE_PATIENTS',
          'Multiple accounts found. Please contact support to merge your accounts.',
        );
      }

      return this.applyAuthResponse(resp);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async register(credentials: RegisterCredentials): Promise<User> {
    this.updateState({ isLoading: true, error: null });
    try {
      const resp = await firstValueFrom(
        this.http.post<ApiAuthResponse>(`${this.apiUrl}/auth/patient-register`, {
          name:
            credentials.displayName ||
            `${credentials.firstName ?? ''} ${credentials.lastName ?? ''}`.trim(),
          email: credentials.email,
          password: credentials.password,
        }),
      );
      return this.applyAuthResponse(resp);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Google login — sends the Google ID token to the backend.
   * The caller must obtain the idToken from Google Sign-In first.
   */
  async loginWithGoogleToken(idToken: string): Promise<User> {
    this.updateState({ isLoading: true, error: null });
    try {
      const resp = await firstValueFrom(
        this.http.post<ApiAuthResponse>(`${this.apiUrl}/auth/google`, { idToken }),
      );
      return this.applyAuthResponse(resp);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Stub kept so existing components that call loginWithGoogle() don't break.
   * Replace with a real Google Sign-In SDK flow when ready.
   */
  async loginWithGoogle(): Promise<User> {
    throw this.makeError(
      'GOOGLE_NOT_CONFIGURED',
      'Google sign-in is not yet configured. Please use email and password.',
    );
  }

  async logout(): Promise<void> {
    this.clearStorage();
    this.updateState({ user: null, isAuthenticated: false, isLoading: false, error: null });
    this.router.navigate(['/']);
  }

  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiUrl}/auth/patient-forgot-password`, {
          email: request.email,
        }),
      );
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async updateUserProfile(request: UpdateProfileRequest): Promise<User> {
    const current = this.authStateSubject.value.user;
    if (!current) throw this.makeError('NO_USER', 'No authenticated user');

    // Merge locally — extend later with a PATCH /auth/profile call if needed
    const updated: User = {
      ...current,
      name: request.displayName ?? current.name,
      preferences: request.preferences
        ? { ...current.preferences!, ...request.preferences }
        : current.preferences,
      profile: request.profile ? { ...current.profile, ...request.profile } : current.profile,
    };

    this.saveSession(this.getToken()!, updated);
    this.updateState({ user: updated });
    return updated;
  }

  /** Email verification is handled server-side via the reset email flow — no-op here. */
  async sendEmailVerification(): Promise<void> {
    // Not applicable for API-based auth. Left for component compatibility.
  }

  // ── User preferences (localStorage) ──────────────────────────────────────

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        dailyReminders: true,
        weeklyReports: true,
        assessmentReminders: true,
        exerciseReminders: true,
        crisisAlerts: true,
      },
      accessibility: {
        fontSize: 'medium',
        highContrast: false,
        reducedMotion: false,
        screenReader: false,
      },
      privacy: {
        dataCollection: true,
        analytics: true,
        personalizedContent: true,
        shareProgress: false,
      },
    };
  }

  private loadPreferences(): UserPreferences {
    if (!this.isBrowser) return this.getDefaultPreferences();
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw
        ? { ...this.getDefaultPreferences(), ...JSON.parse(raw) }
        : this.getDefaultPreferences();
    } catch {
      return this.getDefaultPreferences();
    }
  }

  savePreferences(prefs: Partial<UserPreferences>): void {
    if (!this.isBrowser) return;
    const merged = { ...this.loadPreferences(), ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    const user = this.authStateSubject.value.user;
    if (user) {
      const updated = { ...user, preferences: merged };
      this.saveSession(this.getToken()!, updated);
      this.updateState({ user: updated });
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  // ── Error handling ────────────────────────────────────────────────────────

  private handleError(err: unknown): AuthError {
    if (err instanceof HttpErrorResponse) {
      const msg: string = err.error?.message ?? err.message ?? 'Request failed';
      const authErr = this.makeError(String(err.status), msg);
      this.updateState({ isLoading: false, error: authErr.message });
      return authErr;
    }
    // Already an AuthError thrown internally
    if (this.isAuthError(err)) {
      this.updateState({ isLoading: false, error: err.message });
      return err;
    }
    const fallback = this.makeError('UNKNOWN', 'An unexpected error occurred');
    this.updateState({ isLoading: false, error: fallback.message });
    return fallback;
  }

  private makeError(code: string, message: string): AuthError {
    return { code, message };
  }

  private isAuthError(val: unknown): val is AuthError {
    return typeof val === 'object' && val !== null && 'code' in val && 'message' in val;
  }
}
