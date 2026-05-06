import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from './admin-auth';

@Injectable({
  providedIn: 'root'
})
export class AdminApi {
  private readonly apiBase = 'http://localhost:4000';

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AdminAuth
  ) {}

  private headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.token()}`
    });
  }

  getReports() {
    return firstValueFrom(this.http.get(`${this.apiBase}/admin/reports`, { headers: this.headers() }));
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
        headers: this.headers(),
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
        headers: this.headers(),
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 6),
          q: params.q ?? ''
        }
      })
    );
  }

  approveDoctor(doctorId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/doctors/${doctorId}/approve`, {}, { headers: this.headers() }));
  }

  rejectDoctor(doctorId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}/admin/doctors/${doctorId}/reject`, {}, { headers: this.headers() }));
  }

  getConsultations() {
    return firstValueFrom(
      this.http.get<{ consultations: Array<any> }>(`${this.apiBase}/consultations`, { headers: this.headers() })
    );
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
        headers: this.headers(),
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
}
