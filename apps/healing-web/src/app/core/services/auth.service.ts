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
  PatientProfileResponse,
  PatientProfileUpdateRequest,
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
const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

type GoogleCredentialResponse = {
  credential?: string;
};

type GooglePromptMomentNotification = {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  getNotDisplayedReason(): string;
  getSkippedReason(): string;
};

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        use_fedcm_for_prompt?: boolean;
      }): void;
      prompt(callback?: (notification: GooglePromptMomentNotification) => void): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

type GoogleWindow = Window &
  typeof globalThis & {
    google?: GoogleIdentityApi;
    GOOGLE_CLIENT_ID?: string;
  };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private isBrowser = isPlatformBrowser(this.platformId);
  private apiUrl = environment.apiUrl;
  private googleScriptPromise: Promise<void> | null = null;
  private googleClientIdPromise: Promise<string> | null = null;

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

  async requestOtp(email: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiUrl}/auth/request-otp`, { email }),
      );
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async loginWithOtp(email: string, otp: string): Promise<User> {
    this.updateState({ isLoading: true, error: null });
    try {
      const resp = await firstValueFrom(
        this.http.post<ApiAuthResponse | PatientSelectionResponse>(
          `${this.apiUrl}/auth/patient-login`,
          {
            email,
            otp,
          },
        ),
      );

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

  async loginWithGoogle(): Promise<User> {
    this.updateState({ isLoading: true, error: null });
    try {
      const idToken = await this.getGoogleIdToken();
      return await this.loginWithGoogleToken(idToken);
    } catch (err) {
      throw this.handleError(err);
    }
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

  loadPatientProfile() {
    return this.http.get<PatientProfileResponse>(`${this.apiUrl}/patient/profile`);
  }

  async savePatientProfile(request: PatientProfileUpdateRequest): Promise<PatientProfileResponse> {
    const response = await firstValueFrom(
      this.http.put<PatientProfileResponse>(`${this.apiUrl}/patient/profile`, request),
    );
    const current = this.authStateSubject.value.user;
    if (current) {
      const updated = {
        ...current,
        name: response.profile.name,
        email: response.profile.email,
        mobile: response.profile.mobile,
        patientCode: response.profile.patientCode,
      };
      this.saveSession(this.getToken()!, updated);
      this.updateState({ user: updated });
    }
    return response;
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
      const authErr = this.makeError(err.error?.code ?? String(err.status), msg);
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

  private async getGoogleClientId(): Promise<string> {
    if (!this.isBrowser) return environment.googleClientId || '';
    const runtimeClientId = (window as GoogleWindow).GOOGLE_CLIENT_ID;
    const bundledClientId = runtimeClientId || environment.googleClientId || '';
    if (bundledClientId) return bundledClientId;

    if (!this.googleClientIdPromise) {
      this.googleClientIdPromise = firstValueFrom(
        this.http.get<{ configured: boolean; clientId: string | null }>(
          `${this.apiUrl}/auth/google-config`,
        ),
      ).then((config) => config.clientId || '');
    }

    return this.googleClientIdPromise;
  }

  private async getGoogleIdToken(): Promise<string> {
    if (!this.isBrowser) {
      throw this.makeError(
        'GOOGLE_BROWSER_REQUIRED',
        'Google sign-in is available in the browser only.',
      );
    }

    const clientId = await this.getGoogleClientId();
    if (!clientId) {
      throw this.makeError('GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured yet.');
    }

    await this.loadGoogleIdentityScript();

    const googleAccounts = (window as GoogleWindow).google?.accounts;
    if (!googleAccounts?.id) {
      throw this.makeError('GOOGLE_SDK_UNAVAILABLE', 'Google sign-in could not be loaded.');
    }

    return new Promise<string>((resolve, reject) => {
      let settled = false;

      // Initialize with FedCM (avoids implicit grant warning)
      googleAccounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        callback: (response) => {
          if (settled) return;
          settled = true;
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(
              this.makeError('GOOGLE_TOKEN_MISSING', 'Google did not return a sign-in token.'),
            );
          }
        },
      });

      // Render a hidden button and programmatically click it
      // This is the recommended approach over prompt() for SPAs
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden';
      document.body.appendChild(container);

      googleAccounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
      });

      const btn = container.querySelector<HTMLElement>('[role="button"], div[tabindex]');
      if (btn) {
        btn.click();
      } else {
        // Fallback to prompt if renderButton didn't produce a clickable element
        googleAccounts.id.prompt((notification) => {
          if (settled) return;
          if (notification.isNotDisplayed()) {
            settled = true;
            document.body.removeChild(container);
            reject(
              this.makeError(
                'GOOGLE_PROMPT_NOT_DISPLAYED',
                `Google sign-in could not open: ${notification.getNotDisplayedReason()}.`,
              ),
            );
          } else if (notification.isSkippedMoment()) {
            settled = true;
            document.body.removeChild(container);
            reject(
              this.makeError(
                'GOOGLE_PROMPT_SKIPPED',
                `Google sign-in was skipped: ${notification.getSkippedReason()}.`,
              ),
            );
          }
        });
      }

      // Cleanup container after resolution
      const originalResolve = resolve;
      const originalReject = reject;
      resolve = (v) => {
        try {
          document.body.removeChild(container);
        } catch {
          /**/
        }
        originalResolve(v);
      };
      reject = (e) => {
        try {
          document.body.removeChild(container);
        } catch {
          /**/
        }
        originalReject(e);
      };
    });
  }

  private loadGoogleIdentityScript(): Promise<void> {
    if (!this.isBrowser) {
      return Promise.reject(
        this.makeError(
          'GOOGLE_BROWSER_REQUIRED',
          'Google sign-in is available in the browser only.',
        ),
      );
    }

    if ((window as GoogleWindow).google?.accounts?.id) {
      return Promise.resolve();
    }

    if (this.googleScriptPromise) {
      return this.googleScriptPromise;
    }

    this.googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_GSI_SRC}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(this.makeError('GOOGLE_SDK_LOAD_FAILED', 'Google sign-in failed to load.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(this.makeError('GOOGLE_SDK_LOAD_FAILED', 'Google sign-in failed to load.'));
      document.head.appendChild(script);
    });

    return this.googleScriptPromise;
  }
}
