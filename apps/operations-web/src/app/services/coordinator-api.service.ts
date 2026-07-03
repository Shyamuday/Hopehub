import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class CoordinatorApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.COORDINATOR.ME}`));
  }

  getFollowUps(days = 7) {
    return firstValueFrom(
      this.http.get<any>(`${this.base}${API_PATHS.COORDINATOR.FOLLOW_UPS}`, { params: { days: String(days) } })
    );
  }
}
