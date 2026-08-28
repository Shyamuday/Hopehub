import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProviderOnboardingDraftService } from './provider-onboarding-draft.service';
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

type AuthFailure = {
  ok: false;
  message: string;
  fieldErrors: Record<string, string>;
};

type ApiValidationIssue = {
  path?: Array<string | number>;
  message?: string;
  code?: string;
  minimum?: number;
};

function fieldValidationMessage(field: string, issue: ApiValidationIssue): string {
  if (field === 'email') return 'Enter a valid email address.';
  if (field === 'password' && issue.code === 'too_small') {
    return issue.minimum === 1
      ? 'Password is required.'
      : `Use at least ${issue.minimum || 8} characters.`;
  }
  if (field === 'name') return 'Enter your real full name.';
  if (field === 'mobile') return 'Enter a valid 10-digit Indian mobile number.';
  if (field === 'registrationNo') {
    return 'Enter your professional registration number (at least 3 characters).';
  }
  if (field === 'otp') return 'Enter the OTP sent to your email.';
  return issue.message || 'Check this field and try again.';
}

function authFailure(error: any, fallbackMessage: string): AuthFailure {
  const issues = Array.isArray(error?.error?.issues)
    ? (error.error.issues as ApiValidationIssue[])
    : [];
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path?.[0];
    if (typeof field === 'string' && issue.message && !fieldErrors[field]) {
      fieldErrors[field] = fieldValidationMessage(field, issue);
    }
  }
  const code = typeof error?.error?.code === 'string' ? error.error.code : '';
  if (code === 'EMAIL_IN_USE') {
    fieldErrors['email'] = 'This email is already connected to an account. Sign in instead.';
  } else if (code === 'MOBILE_IN_USE') {
    fieldErrors['mobile'] = 'This mobile number is already connected to an account.';
  } else if (code === 'REGISTRATION_NUMBER_IN_USE') {
    fieldErrors['registrationNo'] =
      'This professional registration number is already connected to an account.';
  }
  return {
    ok: false,
    message:
      issues.length || Object.keys(fieldErrors).length
        ? 'Please correct the highlighted fields.'
        : error?.error?.message || fallbackMessage,
    fieldErrors,
  };
}

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
  private readonly onboardingDrafts = inject(ProviderOnboardingDraftService);
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
      return {
        ok: false as const,
        message: AUTH_MESSAGES.CREDENTIALS_REQUIRED,
        fieldErrors: {
          ...(!email ? { email: 'Email is required.' } : {}),
          ...(!password ? { password: 'Password is required.' } : {}),
        },
      };
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
      return authFailure(error, AUTH_MESSAGES.INVALID_LOGIN);
    }
  }

  async requestOtp(email: string) {
    if (!email) {
      return {
        ok: false as const,
        message: 'Email is required.',
        fieldErrors: { email: 'Email is required.' },
      };
    }

    try {
      await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiBase}/auth/request-staff-otp`, { email }),
      );
      return { ok: true as const };
    } catch (error: any) {
      return authFailure(error, 'Could not send OTP.');
    }
  }

  async loginWithOtp(email: string, otp: string) {
    if (!email || !otp) {
      return {
        ok: false as const,
        message: 'Email and OTP are required.',
        fieldErrors: {
          ...(!email ? { email: 'Email is required.' } : {}),
          ...(!otp ? { otp: 'OTP is required.' } : {}),
        },
      };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBase}/auth/staff-login-otp`, { email, otp }),
      );

      this.persistSession(response);
      return { ok: true as const };
    } catch (error: any) {
      const failure = authFailure(error, AUTH_MESSAGES.INVALID_LOGIN);
      if (!Object.keys(failure.fieldErrors).length && /otp/i.test(failure.message)) {
        failure.fieldErrors['otp'] = failure.message;
        failure.message = 'Please correct the highlighted fields.';
      }
      return failure;
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
    providerDomain?: 'HOMEOPATHY' | 'HOPE_HUB';
    specialty?: string;
    registrationNo?: string;
    careTeamType?: string;
    careTeamTypes?: string[];
  }) {
    if (!payload.name || !payload.email || !payload.password) {
      return {
        ok: false as const,
        message: AUTH_MESSAGES.ENROLL_REQUIRED_FIELDS,
        fieldErrors: {
          ...(!payload.name ? { name: 'Full name is required.' } : {}),
          ...(!payload.email ? { email: 'Email is required.' } : {}),
          ...(!payload.password ? { password: 'Password is required.' } : {}),
        },
      };
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
      return authFailure(error, AUTH_MESSAGES.ENROLL_FAILED);
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
    this.onboardingDrafts.clearAll();
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
