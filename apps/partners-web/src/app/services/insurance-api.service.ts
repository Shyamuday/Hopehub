import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class InsuranceApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.INSURANCE.ME}`));
  }

  getClaims() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.INSURANCE.CLAIMS}`));
  }

  createClaim(data: { patientId: string; claimAmountInPaise: number; description?: string }) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.INSURANCE.CLAIMS}`, data));
  }
}
