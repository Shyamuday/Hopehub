import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CLINIC_API_BASE_URL } from './api-base.url';

/** Thin HttpClient wrapper for apps that use interceptors for auth headers. */
@Injectable({ providedIn: 'root' })
export class ClinicHttpClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(CLINIC_API_BASE_URL);

  get<T>(path: string, options?: { params?: Record<string, string> }) {
    return firstValueFrom(this.http.get<T>(`${this.base}${path}`, options));
  }

  post<T>(path: string, body?: unknown) {
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, body ?? {}));
  }

  put<T>(path: string, body?: unknown) {
    return firstValueFrom(this.http.put<T>(`${this.base}${path}`, body ?? {}));
  }

  patch<T>(path: string, body?: unknown) {
    return firstValueFrom(this.http.patch<T>(`${this.base}${path}`, body ?? {}));
  }

  delete<T>(path: string) {
    return firstValueFrom(this.http.delete<T>(`${this.base}${path}`));
  }

  getBlob(path: string) {
    return firstValueFrom(this.http.get(`${this.base}${path}`, { responseType: 'blob' }));
  }
}
