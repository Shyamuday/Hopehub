import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CLINIC_API_BASE_URL } from '@vitalis/clinic-api';
import { AUTH_TOKEN_KEY } from '../core/constants/auth.constants';
import { RAZORPAY_CHECKOUT } from '../core/constants/branding.constants';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

@Injectable({ providedIn: 'root' })
export class ClinicApiClient {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(CLINIC_API_BASE_URL);

  get backendToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  }

  async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = `${this.apiBase}${path}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    let request$;
    switch (method) {
      case 'POST':
        request$ = this.http.post<T>(url, body ?? {});
        break;
      case 'PUT':
        request$ = this.http.put<T>(url, body ?? {});
        break;
      case 'PATCH':
        request$ = this.http.patch<T>(url, body ?? {});
        break;
      case 'DELETE':
        request$ = this.http.delete<T>(url);
        break;
      default:
        request$ = this.http.get<T>(url);
    }

    try {
      return await firstValueFrom(request$);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as { error?: { message?: string } }).error?.message === 'string'
          ? (error as { error: { message: string } }).error.message
          : 'Request failed.';
      throw new Error(message);
    }
  }

  get<T>(path: string): Promise<T> {
    return this.apiFetch<T>(path);
  }

  loadRazorpayScript() {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT.SCRIPT_URL;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
      document.body.appendChild(script);
    });
  }
}
