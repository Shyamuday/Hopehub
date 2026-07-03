import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AUTH_MESSAGES, AUTH_TOKEN_KEY, STAFF_ROLES } from '../constants/auth.constants';
import { API_PATHS } from '../constants/api-paths.constants';

@Service()
export class AdminAuth {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = AUTH_TOKEN_KEY;
  private readonly apiBase = environment.apiUrl;

  isLoggedIn() {
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }

  async login(email: string, password: string) {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string; user: { role: string } }>(`${this.apiBase}${API_PATHS.AUTH.STAFF_LOGIN}`, { email, password })
      );

      if (response.user.role !== STAFF_ROLES.ADMIN) {
        return { ok: false as const, message: AUTH_MESSAGES.ADMIN_ONLY };
      }

      localStorage.setItem(this.tokenKey, response.token);
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || AUTH_MESSAGES.INVALID_LOGIN };
    }
  }

  applyDevLogin(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }
}
