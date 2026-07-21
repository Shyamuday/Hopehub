import { signal, inject, computed, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthResponse, HrUser, SessionResponse } from '../models';
import { StorePortalStaff } from '../models/store';
import { ROUTE_PATHS } from '../core/constants/app-routes.constants';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_CAPABILITIES_KEY,
  AUTH_DEFAULT_ROUTE_KEY,
  AUTH_STORE_STAFF_KEY,
  AUTH_PATHS
} from '../core/constants/auth.constants';
import { OPERATIONS_NAV_ITEMS, navItemsForCapabilities } from '@hopehub/platform-nav';

export type StaffLoginResponse = AuthResponse & Partial<SessionResponse> & { storeStaff?: StorePortalStaff };

@Service()
export class PlatformAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<HrUser | null>(this.loadUser());
  capabilities = signal<string[]>(this.loadCapabilities());
  defaultRoute = signal<string>(this.loadDefaultRoute());
  storeStaff = signal<StorePortalStaff | null>(this.loadStoreStaff());

  readonly isStoreSession = computed(() => !!this.storeStaff());

  navItems = () => navItemsForCapabilities(OPERATIONS_NAV_ITEMS, this.capabilities());

  private loadUser(): HrUser | null {
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
    return localStorage.getItem(AUTH_DEFAULT_ROUTE_KEY) ?? ROUTE_PATHS.DASHBOARD;
  }

  private loadStoreStaff(): StorePortalStaff | null {
    try {
      const raw = localStorage.getItem(AUTH_STORE_STAFF_KEY);
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

  hasCapability(capability: string): boolean {
    return this.capabilities().includes(capability);
  }

  private persistSession(session: SessionResponse, storeStaff?: StorePortalStaff | null) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    localStorage.setItem(AUTH_CAPABILITIES_KEY, JSON.stringify(session.capabilities));
    localStorage.setItem(AUTH_DEFAULT_ROUTE_KEY, session.defaultRoute);
    this.currentUser.set(session.user);
    this.capabilities.set(session.capabilities);
    this.defaultRoute.set(session.defaultRoute);

    if (storeStaff) {
      localStorage.setItem(AUTH_STORE_STAFF_KEY, JSON.stringify(storeStaff));
      this.storeStaff.set(storeStaff);
    } else {
      localStorage.removeItem(AUTH_STORE_STAFF_KEY);
      this.storeStaff.set(null);
    }
  }

  applyLoginResponse(res: StaffLoginResponse) {
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    if (res.capabilities?.length) {
      this.persistSession(
        {
          user: res.user,
          capabilities: res.capabilities,
          portal: res.portal ?? 'operations',
          defaultRoute: res.defaultRoute ?? ROUTE_PATHS.DASHBOARD
        },
        res.storeStaff ?? null
      );
    } else {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      this.currentUser.set(res.user);
    }
  }

  login(email: string, password: string) {
    return this.http
      .post<StaffLoginResponse>(`${environment.apiUrl}${AUTH_PATHS.LOGIN}`, { email, password })
      .pipe(tap((res) => this.applyLoginResponse(res)));
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
    localStorage.removeItem(AUTH_STORE_STAFF_KEY);
    this.currentUser.set(null);
    this.capabilities.set([]);
    this.defaultRoute.set(ROUTE_PATHS.DASHBOARD);
    this.storeStaff.set(null);
    this.router.navigate([`/${ROUTE_PATHS.LOGIN}`]);
  }

  fetchMe() {
    return this.http.get<SessionResponse>(`${environment.apiUrl}${AUTH_PATHS.ME}`).pipe(
      tap((session) => this.persistSession(session))
    );
  }
}

/** @deprecated Use PlatformAuthService */
export const HrAuthService = PlatformAuthService;
