import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class ClinicManagerApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.CLINIC_MANAGER.ME}`));
  }

  getDashboard() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.CLINIC_MANAGER.DASHBOARD}`));
  }

  getRoster(date?: string) {
    const params = date ? { date } : undefined;
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.CLINIC_MANAGER.ROSTER}`, { params }));
  }

  getSchedules(from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.CLINIC_MANAGER.SCHEDULES}`, { params }));
  }
}
