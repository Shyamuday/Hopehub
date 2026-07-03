import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class MarketingApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.MARKETING.ME}`));
  }

  getFunnels(days = 30) {
    return firstValueFrom(
      this.http.get<any>(`${this.base}${API_PATHS.MARKETING.FUNNELS}`, { params: { days: String(days) } })
    );
  }
}
