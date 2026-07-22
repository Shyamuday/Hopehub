import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AUTH_MESSAGES, AUTH_PATHS, AUTH_TOKEN_KEY } from '../constants/auth.constants';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly tokenKey = AUTH_TOKEN_KEY;
  private readonly apiBase = environment.apiUrl;

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
        this.http.post<{ token: string }>(`${this.apiBase}${AUTH_PATHS.STAFF_LOGIN}`, {
          email,
          password,
        }),
      );

      localStorage.setItem(this.tokenKey, response.token);
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || AUTH_MESSAGES.INVALID_LOGIN };
    }
  }

  async enrollProvider(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    providerType?: string;
    specialization?: string;
    specialty?: string;
    registrationNo?: string;
  }) {
    if (!payload.name || !payload.email || !payload.password) {
      return { ok: false as const, message: AUTH_MESSAGES.ENROLL_REQUIRED_FIELDS };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ message?: string }>(
          `${this.apiBase}${AUTH_PATHS.PROVIDER_ENROLL}`,
          payload,
        ),
      );
      return {
        ok: true as const,
        message: response.message || AUTH_MESSAGES.ENROLL_DEFAULT_SUCCESS,
      };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || AUTH_MESSAGES.ENROLL_FAILED };
    }
  }

  enrollDoctor(payload: Parameters<Auth['enrollProvider']>[0]) {
    return this.enrollProvider(payload);
  }

  applyDevLogin(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }
}
