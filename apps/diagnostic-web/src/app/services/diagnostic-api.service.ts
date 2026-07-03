import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class DiagnosticApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.DIAGNOSTIC.ME}`));
  }

  getReferrals(status?: string) {
    const params = status ? { status } : undefined;
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.DIAGNOSTIC.REFERRALS}`, { params }));
  }

  getReferral(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.DIAGNOSTIC.REFERRAL(id)}`));
  }

  acceptReferral(id: string, data: { partnerNotes?: string; expectedResultDate?: string }) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.DIAGNOSTIC.ACCEPT(id)}`, data));
  }

  advanceReferral(id: string, status: 'SAMPLE_COLLECTED' | 'IN_PROGRESS') {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.DIAGNOSTIC.ADVANCE(id)}`, { status }));
  }

  submitResults(id: string, lines: Array<{ lineId: string; resultSummary: string; resultFileUrl?: string }>) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.DIAGNOSTIC.RESULTS(id)}`, { lines }));
  }
}
