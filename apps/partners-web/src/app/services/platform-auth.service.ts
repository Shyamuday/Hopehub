import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthResponse, PartnerUser, SessionResponse } from '../models';
import { ROUTE_PATHS } from '../core/constants/app-routes.constants';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_CAPABILITIES_KEY,
  AUTH_DEFAULT_ROUTE_KEY,
  AUTH_PATHS
} from '../core/constants/auth.constants';
import { PARTNERS_NAV_ITEMS, navItemsForCapabilities } from '../../../../../libs/platform-nav/src/index';

@Injectable({ providedIn: 'root' })
export class PlatformAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<PartnerUser | null>(this.loadUser());
  capabilities = signal<string[]>(this.loadCapabilities());
  defaultRoute = signal<string>(this.loadDefaultRoute());

  navItems = () => navItemsForCapabilities(PARTNERS_NAV_ITEMS, this.capabilities());

  private loadUser(): PartnerUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadCapabilities(): string[] {
    try {
      const raw = localStorage.getItem(AUTH_CAPABILITIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private loadDefaultRoute(): string {
    return localStorage.getItem(AUTH_DEFAULT_ROUTE_KEY) ?? ROUTE_PATHS.CLAIMS;
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasCapability(capability: string): boolean {
    return this.capabilities().includes(capability);
  }

  private persistSession(session: SessionResponse) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    localStorage.setItem(AUTH_CAPABILITIES_KEY, JSON.stringify(session.capabilities));
    localStorage.setItem(AUTH_DEFAULT_ROUTE_KEY, session.defaultRoute);
    this.currentUser.set(session.user);
    this.capabilities.set(session.capabilities);
    this.defaultRoute.set(session.defaultRoute);
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}${AUTH_PATHS.LOGIN}`, { email, password })
      .pipe(tap((res) => localStorage.setItem(AUTH_TOKEN_KEY, res.token)));
  }

  applyDevAuth(response: AuthResponse) {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_CAPABILITIES_KEY);
    localStorage.removeItem(AUTH_DEFAULT_ROUTE_KEY);
    this.currentUser.set(null);
    this.capabilities.set([]);
    this.defaultRoute.set(ROUTE_PATHS.CLAIMS);
    this.router.navigate([`/${ROUTE_PATHS.LOGIN}`]);
  }

  fetchMe() {
    return this.http.get<SessionResponse>(`${environment.apiUrl}${AUTH_PATHS.ME}`).pipe(
      tap((session) => this.persistSession(session))
    );
  }
}
