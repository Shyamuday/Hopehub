import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_PATHS } from '../../constants/api-paths.constants';
import { environment } from '../../../../environments/environment';

export type ClinicalListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  doctorId?: string;
  patientId?: string;
  methodOptionId?: string;
  consultationId?: string;
  status?: string;
  latestOnly?: boolean;
};

function toParams(params: ClinicalListParams) {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}

@Injectable({ providedIn: 'root' })
export class AdminClinicalApi {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  listMethodOptions() {
    return firstValueFrom(
      this.http.get<{ options: Array<{ id: string; label: string; normalizedLabel?: string }> }>(
        `${this.apiBase}${API_PATHS.ADMIN.CLINICAL_METHOD_OPTIONS}`
      )
    );
  }

  listPrescriptions(params: ClinicalListParams = {}) {
    return firstValueFrom(
      this.http.get<{ prescriptions: unknown[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.PRESCRIPTIONS}`,
        { params: toParams(params) }
      )
    );
  }

  getPrescription(id: string) {
    return firstValueFrom(
      this.http.get<{ prescription: unknown }>(`${this.apiBase}${API_PATHS.ADMIN.PRESCRIPTION_BY_ID(id)}`)
    );
  }

  listCaseAnalyses(params: ClinicalListParams = {}) {
    return firstValueFrom(
      this.http.get<{ analyses: unknown[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.CASE_ANALYSES}`,
        { params: toParams(params) }
      )
    );
  }

  getCaseAnalysis(id: string) {
    return firstValueFrom(
      this.http.get<{ analysis: unknown }>(`${this.apiBase}${API_PATHS.ADMIN.CASE_ANALYSIS_BY_ID(id)}`)
    );
  }
}
