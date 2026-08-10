import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AUTH_MESSAGES,
  AUTH_PATHS,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_SESSION_ID_KEY,
  AUTH_TOKEN_KEY,
} from '../constants/auth.constants';

const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

type GoogleCredentialResponse = {
  credential?: string;
};

type AuthResponse = {
  token: string;
  refreshToken?: string;
  sessionId?: string;
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

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly tokenKey = AUTH_TOKEN_KEY;
  private readonly apiBase = environment.apiUrl;
  private googleScriptPromise: Promise<void> | null = null;
  private googleClientIdPromise: Promise<string> | null = null;

  constructor(private readonly http: HttpClient) {}

  isLoggedIn() {
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      return { ok: false as const, message: AUTH_MESSAGES.CREDENTIALS_REQUIRED };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.STAFF_LOGIN}`, {
          email,
          password,
        }),
      );

      this.persistSession(response);
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || AUTH_MESSAGES.INVALID_LOGIN };
    }
  }

  async requestOtp(email: string) {
    if (!email) {
      return { ok: false as const, message: 'Email is required.' };
    }

    try {
      await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiBase}/auth/request-staff-otp`, { email }),
      );
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || 'Could not send OTP.' };
    }
  }

  async loginWithOtp(email: string, otp: string) {
    if (!email || !otp) {
      return { ok: false as const, message: 'Email and OTP are required.' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBase}/auth/staff-login-otp`, { email, otp }),
      );

      this.persistSession(response);
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || AUTH_MESSAGES.INVALID_LOGIN };
    }
  }

  async loginWithGoogle() {
    try {
      const idToken = await this.getGoogleIdToken();
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.STAFF_GOOGLE_LOGIN}`, {
          idToken,
        }),
      );

      this.persistSession(response);
      return { ok: true as const };
    } catch (error: any) {
      return {
        ok: false as const,
        message:
          error?.error?.message ||
          error?.message ||
          'Google sign-in failed. Please use OTP or password.',
      };
    }
  }

  async enrollDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
    careTeamType?: string;
    careTeamTypes?: string[];
  }) {
    if (!payload.name || !payload.email || !payload.password || !payload.specialty) {
      return { ok: false as const, message: AUTH_MESSAGES.ENROLL_REQUIRED_FIELDS };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ message?: string }>(`${this.apiBase}${AUTH_PATHS.DOCTOR_ENROLL}`, payload),
      );
      return {
        ok: true as const,
        message: response.message || AUTH_MESSAGES.ENROLL_DEFAULT_SUCCESS,
      };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || AUTH_MESSAGES.ENROLL_FAILED };
    }
  }

  applyDevLogin(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  logout() {
    const refreshToken = this.refreshToken();
    if (refreshToken) {
      void firstValueFrom(
        this.http.post(`${this.apiBase}${AUTH_PATHS.LOGOUT}`, { refreshToken }),
      ).catch(() => undefined);
    }
    this.clearSession();
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }

  refreshToken() {
    return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || '';
  }

  async refreshSession() {
    const refreshToken = this.refreshToken();
    if (!refreshToken) return false;
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBase}${AUTH_PATHS.REFRESH}`, { refreshToken }),
      );
      this.persistSession(response);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private persistSession(response: AuthResponse) {
    if (response.token) localStorage.setItem(this.tokenKey, response.token);
    if (response.refreshToken) localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, response.refreshToken);
    if (response.sessionId) localStorage.setItem(AUTH_SESSION_ID_KEY, response.sessionId);
  }

  private clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_ID_KEY);
  }

  private async getGoogleClientId(): Promise<string> {
    if (typeof window === 'undefined') {
      return (environment as { googleClientId?: string }).googleClientId || '';
    }

    const runtimeClientId = (window as GoogleWindow).GOOGLE_CLIENT_ID;
    const bundledClientId =
      runtimeClientId || (environment as { googleClientId?: string }).googleClientId || '';
    if (bundledClientId) return bundledClientId;

    if (!this.googleClientIdPromise) {
      this.googleClientIdPromise = firstValueFrom(
        this.http.get<{ configured: boolean; clientId: string | null }>(
          `${this.apiBase}${AUTH_PATHS.GOOGLE_CONFIG}`,
        ),
      ).then((config) => config.clientId || '');
    }

    return this.googleClientIdPromise;
  }

  private async getGoogleIdToken(): Promise<string> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('Google sign-in is available in the browser only.');
    }

    const clientId = await this.getGoogleClientId();
    if (!clientId) {
      throw new Error('Google sign-in is not configured yet.');
    }

    await this.loadGoogleIdentityScript();

    const googleAccounts = (window as GoogleWindow).google?.accounts;
    if (!googleAccounts?.id) {
      throw new Error('Google sign-in could not be loaded.');
    }

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden';
      document.body.appendChild(container);

      const cleanup = () => {
        try {
          document.body.removeChild(container);
        } catch {
          // Already removed.
        }
      };

      googleAccounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        callback: (response) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('Google did not return a sign-in token.'));
          }
        },
      });

      googleAccounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
      });

      const button = container.querySelector<HTMLElement>('[role="button"], div[tabindex]');
      if (button) {
        button.click();
        return;
      }

      googleAccounts.id.prompt((notification) => {
        if (settled) return;
        if (notification.isNotDisplayed()) {
          settled = true;
          cleanup();
          reject(
            new Error(`Google sign-in could not open: ${notification.getNotDisplayedReason()}.`),
          );
        } else if (notification.isSkippedMoment()) {
          settled = true;
          cleanup();
          reject(new Error(`Google sign-in was skipped: ${notification.getSkippedReason()}.`));
        }
      });
    });
  }

  private loadGoogleIdentityScript(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.reject(new Error('Google sign-in is available in the browser only.'));
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
          () => reject(new Error('Google sign-in failed to load.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google sign-in failed to load.'));
      document.head.appendChild(script);
    });

    return this.googleScriptPromise;
  }
}
