import { inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AUTH_MESSAGES, AUTH_TOKEN_KEY, AUTH_USER_KEY, STAFF_ROLES } from '../constants/auth.constants';
import { API_PATHS } from '../constants/api-paths.constants';
import type { StaffUser } from '../admin-permissions';

@Service()
export class AdminAuth {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = AUTH_TOKEN_KEY;
  private readonly userKey = AUTH_USER_KEY;
  private readonly apiBase = environment.apiUrl;

  readonly user = signal<StaffUser | null>(this.loadUser());

  private loadUser(): StaffUser | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? (JSON.parse(raw) as StaffUser) : null;
    } catch {
      return null;
    }
  }

  setUser(u: StaffUser | null) {
    this.user.set(u);
    if (u) {
      localStorage.setItem(this.userKey, JSON.stringify(u));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  isLoggedIn() {
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }

  async refreshSession(): Promise<StaffUser | null> {
    const session = await firstValueFrom(
      this.http.get<{ user: StaffUser }>(`${this.apiBase}${API_PATHS.AUTH.ME}`)
    );
    this.setUser(session.user);
    return session.user;
  }

  async login(email: string, password: string) {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string; user: StaffUser }>(
          `${this.apiBase}${API_PATHS.AUTH.STAFF_LOGIN}`,
          { email, password }
        )
      );

      if (response.user.role !== STAFF_ROLES.ADMIN && response.user.role !== STAFF_ROLES.HR) {
        return { ok: false as const, message: AUTH_MESSAGES.ADMIN_ONLY };
      }

      localStorage.setItem(this.tokenKey, response.token);
      this.setUser(response.user);
      return { ok: true as const };
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'error' in error
          ? (error as { error?: { message?: string } }).error?.message
          : undefined;
      return { ok: false as const, message: message || AUTH_MESSAGES.INVALID_LOGIN };
    }
  }

  applyDevLogin(token: string, user?: StaffUser | null) {
    localStorage.setItem(this.tokenKey, token);
    if (user) this.setUser(user);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.setUser(null);
  }
}
