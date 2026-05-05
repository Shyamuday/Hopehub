import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly tokenKey = 'doctor_app_token';
  private readonly apiBase = 'http://localhost:4000';

  constructor(private readonly http: HttpClient) {}

  isLoggedIn() {
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string }>(`${this.apiBase}/auth/staff-login`, { email, password })
      );

      localStorage.setItem(this.tokenKey, response.token);
      return { ok: true as const };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || 'Invalid login or API unavailable.' };
    }
  }

  async enrollDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }) {
    if (!payload.name || !payload.email || !payload.password || !payload.specialty) {
      return { ok: false as const, message: 'Name, email, password, and specialty are required.' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ message?: string }>(`${this.apiBase}/doctor/enroll`, payload)
      );
      return {
        ok: true as const,
        message: response.message || 'Enrollment submitted. Wait for admin approval.'
      };
    } catch (error: any) {
      return { ok: false as const, message: error?.error?.message || 'Could not enroll doctor account.' };
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }
}
