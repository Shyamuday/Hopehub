import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';
import { AUTH_TOKEN_KEY } from '../core/constants/auth.constants';

@Injectable({ providedIn: 'root' })
export class AccountantApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.ACCOUNTANT.ME}`));
  }

  getSummary(month: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.base}${API_PATHS.ACCOUNTANT.SUMMARY}`, { params: { month } })
    );
  }

  getBranches(month: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.base}${API_PATHS.ACCOUNTANT.BRANCHES}`, { params: { month } })
    );
  }

  async exportBundle(params: { month: string; storeId?: string }) {
    const query = new URLSearchParams({ month: params.month });
    if (params.storeId) query.set('storeId', params.storeId);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(
      `${this.base}${API_PATHS.ACCOUNTANT.EXPORT_BUNDLE}?${query.toString()}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!response.ok) throw new Error('Export failed');
    return response.text();
  }
}
