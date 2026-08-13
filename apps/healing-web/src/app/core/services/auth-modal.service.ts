import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type AuthModalType = 'login' | 'register' | 'forgot-password' | null;

@Injectable({
  providedIn: 'root',
})
export class AuthModalService {
  private modalStateSubject = new BehaviorSubject<AuthModalType>(null);
  private returnUrl: string | null = null;
  public modalState$: Observable<AuthModalType> = this.modalStateSubject.asObservable();

  openLogin(): void {
    this.modalStateSubject.next('login');
  }

  openLoginFor(returnUrl: string): void {
    this.returnUrl = this.safeReturnUrl(returnUrl);
    this.openLogin();
  }

  consumeReturnUrl(): string | null {
    const returnUrl = this.returnUrl;
    this.returnUrl = null;
    return returnUrl;
  }

  openRegister(): void {
    this.modalStateSubject.next('register');
  }

  openForgotPassword(): void {
    this.modalStateSubject.next('forgot-password');
  }

  close(): void {
    this.modalStateSubject.next(null);
  }

  getCurrentModal(): AuthModalType {
    return this.modalStateSubject.value;
  }

  private safeReturnUrl(value: string): string | null {
    const url = String(value || '').trim();
    return url.startsWith('/') && !url.startsWith('//') ? url : null;
  }
}
