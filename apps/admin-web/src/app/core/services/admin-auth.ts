import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AdminUser } from '../admin-permissions';

@Injectable({
  providedIn: 'root'
})
export class AdminAuth {
  private readonly tokenKey = 'admin_app_token';
  private readonly userKey = 'admin_app_user';
  private readonly apiBase = environment.apiUrl;

  /** Current admin user (including staffProfile for permission checks). */
  readonly user = signal<AdminUser | null>(null);

  constructor(private readonly http: HttpClient) {
    this.hydrateUserFromStorage();
  }

  private hydrateUserFromStorage() {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return;
    }
    try {
      this.user.set(JSON.parse(raw) as AdminUser);
    } catch {
      localStorage.removeItem(this.userKey);
    }
  }

  setUser(u: AdminUser | null) {
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

  async login(email: string, password: string) {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string; user: AdminUser }>(`${this.apiBase}/auth/staff-login`, { email, password })
      );

      if (response.user.role !== 'ADMIN') {
        return { ok: false as const, message: 'Only admin can login to this app.' };
      }

      localStorage.setItem(this.tokenKey, response.token);
      this.setUser(response.user);
      return { ok: true as const };
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'error' in error
          ? (error as { error?: { message?: string } }).error?.message
          : undefined;
      return { ok: false as const, message: message || 'Invalid login or API unavailable.' };
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.setUser(null);
  }
}
