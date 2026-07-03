import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PatientIdCardData = {
  patientCode: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  clinic?: { id: string; name: string; code: string; address?: string | null } | null;
  issuedAt?: string;
  scanUrl?: string;
};

export type PatientSearchResult = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
  homeClinicStoreId?: string | null;
  homeClinicStore?: { id: string; name: string; code: string; address?: string | null } | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
  createdAt?: string;
};

export type PatientSearchResponse = {
  patients: PatientSearchResult[];
  scopeUsed: 'clinic' | 'global' | 'none';
  clinicStoreId?: string | null;
  hint?: string;
};

@Service()
export class PatientsApiService {
  private readonly apiBase = environment.apiUrl;

  private readonly http = inject(HttpClient);

  searchPatients(q: string, scope: 'auto' | 'clinic' | 'global' = 'auto', clinicStoreId?: string) {
    return firstValueFrom(
      this.http.get<PatientSearchResponse>(`${this.apiBase}/patients/search`, {
        params: {
          q,
          scope,
          ...(clinicStoreId ? { clinicStoreId } : {})
        }
      })
    );
  }

  searchByMobile(mobile: string, scope: 'auto' | 'clinic' | 'global' = 'auto') {
    return firstValueFrom(
      this.http.get<PatientSearchResponse>(`${this.apiBase}/patients/by-mobile/${encodeURIComponent(mobile)}`, {
        params: { scope }
      })
    );
  }

  getPatient(id: string) {
    return firstValueFrom(this.http.get<{ patient: PatientSearchResult & { patientConsults?: unknown[] } }>(`${this.apiBase}/patients/${id}`));
  }

  createPatient(payload: { name: string; email?: string; mobile?: string; homeClinicStoreId?: string }) {
    return firstValueFrom(this.http.post<{ patient: PatientSearchResult }>(`${this.apiBase}/patients`, payload));
  }

  getPatientCard(id: string) {
    return firstValueFrom(this.http.get<{ card: PatientIdCardData }>(`${this.apiBase}/patients/${id}/card`));
  }
}
