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
      return true;
    } catch {
      return false;
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
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string }>(`${this.apiBase}/doctor/enroll`, payload)
      );
      localStorage.setItem(this.tokenKey, response.token);
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }

  token() {
    return localStorage.getItem(this.tokenKey) || '';
  }
}
