import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from './admin-auth';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminApi {
  private readonly apiBase = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AdminAuth
  ) {}

  getReports() {
    return firstValueFrom(this.http.get(`${this.apiBase}/admin/reports`));
  }

  getAuditLogs(page = 1, pageSize = 20) {
    return firstValueFrom(
      this.http.get<{ logs: Array<any>; pagination: any }>(`${this.apiBase}/admin/audit-logs`, {
        params: { page: String(page), pageSize: String(pageSize) }
      })
    );
  }

  getPayments(params: {
    page?: number;
    pageSize?: number;
    status?: 'ALL' | 'CREATED' | 'PAID' | 'FAILED';
    from?: string;
    to?: string;
  }) {
    return firstValueFrom(
      this.http.get<{
        payments: Array<any>;
        summary: { total: number; paid: number; failedCount: number; pendingCount: number };
        pagination: any;
      }>(`${this.apiBase}/admin/payments`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 10),
          status: params.status ?? 'ALL',
          from: params.from ?? '',
          to: params.to ?? ''
        }
      })
    );
  }

  async exportPaymentsCsv(params: {
    page?: number;
    pageSize?: number;
    status?: 'ALL' | 'CREATED' | 'PAID' | 'FAILED';
    from?: string;
    to?: string;
  }) {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 100),
      status: params.status ?? 'ALL',
      export: 'csv'
    });
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const response = await fetch(`${this.apiBase}/admin/payments?${query.toString()}`, {
      headers: { Authorization: `Bearer ${this.auth.token()}` }
    });
    if (!response.ok) {
      throw new Error('Could not export payments CSV.');
    }
    return response.text();
  }

  getDoctors() {
    return this.getDoctorsPaged({});
  }

  getPendingDoctors() {
    return this.getPendingDoctorsPaged({});
  }

  getDoctorsPaged(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    sortBy?: 'name' | 'createdAt' | 'status';
    sortDirection?: 'asc' | 'desc';
  }) {
    return firstValueFrom(
      this.http.get<{ doctors: Array<any>; pagination: any }>(`${this.apiBase}/admin/doctors`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 6),
          q: params.q ?? '',
          status: params.status ?? 'ALL',
          sortBy: params.sortBy ?? 'createdAt',
          sortDirection: params.sortDirection ?? 'desc'
        }
      })
    );
  }

  getPendingDoctorsPaged(params: { page?: number; pageSize?: number; q?: string }) {
    return firstValueFrom(
      this.http.get<{ pendingDoctors: Array<any>; pagination: any }>(`${this.apiBase}/admin/doctors/pending`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 6),
          q: params.q ?? ''
        }
      })
    );
  }

  approveDoctor(doctorId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/doctors/${doctorId}/approve`, {}));
  }

  rejectDoctor(doctorId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/doctors/${doctorId}/reject`, {}));
  }

  setDoctorStatus(doctorId: string, isActive: boolean) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/doctors/${doctorId}/status`, { isActive }));
  }

  updateDoctor(
    doctorId: string,
    payload: {
      name: string;
      email: string;
      mobile?: string;
      specialty: string;
      registrationNo?: string;
      isAvailable: boolean;
    }
  ) {
    return firstValueFrom(this.http.put(`${this.apiBase}/admin/doctors/${doctorId}`, payload));
  }

  createDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/doctors`, payload));
  }

  getConsultations() {
    return firstValueFrom(this.http.get<{ consultations: Array<any> }>(`${this.apiBase}/consultations`));
  }

  getConsumersPaged(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: 'name' | 'consultations';
    sortDirection?: 'asc' | 'desc';
  }) {
    return firstValueFrom(
      this.http.get<{ consumers: Array<any>; pagination: any }>(`${this.apiBase}/admin/consumers`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 8),
          q: params.q ?? '',
          sortBy: params.sortBy ?? 'consultations',
          sortDirection: params.sortDirection ?? 'desc'
        }
      })
    );
  }

  getConsumerDetail(consumerId: string) {
    return firstValueFrom(
      this.http.get<{ consumer: any; consultations: Array<any>; adherence: any }>(
        `${this.apiBase}/admin/consumers/${consumerId}`
      )
    );
  }

  assignDoctor(consultationId: string, doctorId: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}/consultations/${consultationId}/assign`, { doctorId })
    );
  }

  getActiveDoctors() {
    return firstValueFrom(
      this.http.get<{ doctors: Array<{ id: string; name: string; doctorProfile?: { specialty?: string } | null }> }>(
        `${this.apiBase}/admin/doctors`,
        { params: { status: 'ACTIVE', pageSize: '100', page: '1', q: '', sortBy: 'name', sortDirection: 'asc' } }
      )
    );
  }

  getDiseases() {
    return firstValueFrom(
      this.http.get<{ diseases: Array<{ id: string; name: string; description: string; feeInPaise: number; isActive: boolean; intakeQuestions: string[] }> }>(
        `${this.apiBase}/admin/diseases/list`
      )
    );
  }

  createDisease(payload: { name: string; description: string; feeInPaise: number; intakeQuestions: string[] }) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/diseases`, payload));
  }

  updateDisease(id: string, payload: { name: string; description: string; feeInPaise: number; isActive: boolean; intakeQuestions: string[] }) {
    return firstValueFrom(this.http.put(`${this.apiBase}/admin/diseases/${id}`, payload));
  }
}
