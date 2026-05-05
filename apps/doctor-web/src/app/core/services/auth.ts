import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly tokenKey = 'doctor_app_token';

  isLoggedIn() {
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  login(email: string, password: string) {
    if (!email || !password) {
      return false;
    }

    // Placeholder login for initial doctor app bootstrap.
    localStorage.setItem(this.tokenKey, 'doctor-session');
    return true;
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }
}
