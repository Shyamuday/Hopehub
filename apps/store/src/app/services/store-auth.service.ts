import { Injectable, signal, computed } from '@angular/core';
import { StoreStaff } from '../models';

const TOKEN_KEY = 'store_token';
const STAFF_KEY = 'store_staff';

@Injectable({ providedIn: 'root' })
export class StoreAuthService {
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _staff = signal<StoreStaff | null>(this.loadStaff());

  readonly token = this._token.asReadonly();
  readonly staff = this._staff.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());
  readonly isManager = computed(() => this._staff()?.role === 'MANAGER');

  private loadStaff(): StoreStaff | null {
    const raw = localStorage.getItem(STAFF_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoreStaff;
    } catch {
      return null;
    }
  }

  setAuth(token: string, staff: StoreStaff): void {
    this._token.set(token);
    this._staff.set(staff);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  }

  logout(): void {
    this._token.set(null);
    this._staff.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
  }

  getToken(): string | null {
    return this._token();
  }
}
