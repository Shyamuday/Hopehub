import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL, SORT_DIRECTIONS } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';
import type { DoctorSortField } from '../../../features/doctors/constants/doctors-list.constants';
import type { SortDirection } from '../../../shared/constants/filter.constants';

import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminDoctorsApi extends AdminApiBase {
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
    sortBy?: DoctorSortField;
    sortDirection?: SortDirection;
  }) {
    return firstValueFrom(
      this.http.get<{ doctors: Array<any>; pagination: any }>(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.DOCTORS),
          q: params.q ?? '',
          status: params.status ?? FILTER_ALL,
          sortBy: params.sortBy ?? 'createdAt',
          sortDirection: params.sortDirection ?? SORT_DIRECTIONS.DESC
        }
      })
    );
  }

  getPendingDoctorsPaged(params: { page?: number; pageSize?: number; q?: string }) {
    return firstValueFrom(
      this.http.get<{ pendingDoctors: Array<any>; pagination: any }>(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS_PENDING}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.DOCTORS),
          q: params.q ?? ''
        }
      })
    );
  }

  approveDoctor(doctorId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/approve`, {}));
  }

  rejectDoctor(doctorId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/reject`, {}));
  }

  setDoctorStatus(doctorId: string, isActive: boolean) {
    return firstValueFrom(this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/status`, { isActive }));
  }

  updateDoctor(
    doctorId: string,
    payload: {
      name: string;
      email: string;
      mobile?: string;
      specialty?: string;
      registrationNo?: string;
      isAvailable: boolean;
      doctorType?: string;
      specialtyFocus?: string | null;
    }
  ) {
    return firstValueFrom(this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}`, payload));
  }

  createDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty?: string;
    registrationNo?: string;
    doctorType?: string;
    specialtyFocus?: string | null;
  }) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}`, payload));
  }
}
