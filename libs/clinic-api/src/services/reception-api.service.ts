import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CLINIC_API_BASE_URL } from '../api-base.url';
import { API_PATHS } from '../api-paths.constants';

@Service()
export class ReceptionApiService {
  private http = inject(HttpClient);
  private base = inject(CLINIC_API_BASE_URL);

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.RECEPTION.ME}`));
  }

  getQueue(params: { status?: string; q?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.RECEPTION.QUEUE}${suffix}`));
  }

  searchPatients(q: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.base}${API_PATHS.RECEPTION.PATIENTS_SEARCH}`, { params: { q } })
    );
  }

  getDoctors() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.RECEPTION.DOCTORS}`));
  }

  getDiseases() {
    return firstValueFrom(this.http.get<{ diseases: Array<any> }>(`${this.base}${API_PATHS.DISEASES}`));
  }

  walkIn(data: Record<string, unknown>) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.RECEPTION.WALK_IN}`, data));
  }

  bookConsultation(data: Record<string, unknown>) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.RECEPTION.CONSULTATIONS}`, data));
  }

  collectCash(consultationId: string) {
    return firstValueFrom(
      this.http.post<any>(`${this.base}${API_PATHS.RECEPTION.COLLECT_CASH(consultationId)}`, {})
    );
  }

  assignDoctor(consultationId: string, doctorId: string) {
    return firstValueFrom(
      this.http.put<any>(`${this.base}${API_PATHS.RECEPTION.ASSIGN(consultationId)}`, { doctorId })
    );
  }

  getVisitorLeadStats() {
    return firstValueFrom(
      this.http.get<{
        stats: {
          total: number;
          newLeads: number;
          needsCallback: number;
          called: number;
          registered: number;
          bySource: Record<string, number>;
        };
      }>(`${this.base}${API_PATHS.RECEPTION.VISITOR_LEAD_STATS}`)
    );
  }

  listVisitorLeads(followUpStatus?: string, page = 1) {
    const params = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (followUpStatus) params.set('followUpStatus', followUpStatus);
    return firstValueFrom(
      this.http.get<{ leads: any[]; pagination: { total: number } }>(
        `${this.base}${API_PATHS.RECEPTION.VISITOR_LEADS}?${params}`
      )
    );
  }

  getVisitorLead(id: string) {
    return firstValueFrom(this.http.get<{ lead: any }>(`${this.base}${API_PATHS.RECEPTION.VISITOR_LEAD_BY_ID(id)}`));
  }

  updateVisitorLeadFollowUp(
    id: string,
    payload: {
      followUpStatus: string;
      operatorNote?: string;
      visitorIssue?: string;
      notInterestedReasonPreset?: string;
      notInterestedReasonDetail?: string;
      markCalled?: boolean;
    }
  ) {
    return firstValueFrom(
      this.http.patch<{ lead: any }>(`${this.base}${API_PATHS.RECEPTION.VISITOR_LEAD_FOLLOW_UP(id)}`, payload)
    );
  }

  getVisitorLeadMeta() {
    return firstValueFrom(
      this.http.get<{ notInterestedReasons: string[] }>(`${this.base}${API_PATHS.RECEPTION.VISITOR_LEAD_META}`)
    );
  }

  bookVisitorLeadConsultation(
    id: string,
    payload: { diseaseId: string; storeId?: string; collectCash?: boolean; notes?: string }
  ) {
    return firstValueFrom(
      this.http.post<{ lead: any; consultation: any }>(
        `${this.base}${API_PATHS.RECEPTION.VISITOR_LEAD_BOOK(id)}`,
        payload
      )
    );
  }
}
