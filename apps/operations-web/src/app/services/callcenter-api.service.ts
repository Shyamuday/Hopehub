import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class CallCenterApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.CALL_CENTER.ME}`));
  }

  searchPatients(q: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.base}${API_PATHS.CALL_CENTER.PATIENT_SEARCH}`, { params: { q } })
    );
  }

  getRecentConsultations() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.CALL_CENTER.RECENT_CONSULTATIONS}`));
  }
}
