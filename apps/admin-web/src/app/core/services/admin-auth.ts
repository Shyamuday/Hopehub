import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminAuth {
  private readonly tokenKey = 'admin_app_token';
  private readonly apiBase = 'http://localhost:4000';

  constructor(private readonly http: HttpClient) {}

  isLoggedIn() {
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }

  async login(email: string, password: string) {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string; user: { role: string } }>(`${this.apiBase}/auth/staff-login`, { email, password })
      );

      if (response.user.role !== 'ADMIN') {
        return { ok: false as const, message: 'Only admin can login to this app.' };
      }

      localStorage.setItem(this.tokenKey, response.token);
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || 'Invalid login or API unavailable.' };
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }
}
