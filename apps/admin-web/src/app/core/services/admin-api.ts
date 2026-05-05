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
    return firstValueFrom(
      this.http.get<{ doctors: Array<any> }>(`${this.apiBase}/admin/doctors`, { headers: this.headers() })
    );
  }

  getPendingDoctors() {
    return firstValueFrom(
      this.http.get<{ pendingDoctors: Array<any> }>(`${this.apiBase}/admin/doctors/pending`, { headers: this.headers() })
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
}
