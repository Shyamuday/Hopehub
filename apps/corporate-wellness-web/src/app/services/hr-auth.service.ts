import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthResponse, ReceptionUser } from '../models';
import { ROUTE_PATHS } from '../core/constants/app-routes.constants';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, AUTH_PATHS } from '../core/constants/auth.constants';

@Injectable({ providedIn: 'root' })
export class HrAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<ReceptionUser | null>(this.loadUser());

  private loadUser(): ReceptionUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}${AUTH_PATHS.LOGIN}`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(AUTH_TOKEN_KEY, res.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  applyDevAuth(response: AuthResponse) {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    this.currentUser.set(null);
    this.router.navigate([`/${ROUTE_PATHS.LOGIN}`]);
  }

  fetchMe() {
    return this.http.get<{ user: ReceptionUser; store: { name: string; code: string } | null }>(`${environment.apiUrl}${AUTH_PATHS.ME}`).pipe(
      tap(res => {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }
}
