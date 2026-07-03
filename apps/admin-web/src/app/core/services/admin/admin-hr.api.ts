import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';

import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminHrApi extends AdminApiBase {
  // HR — Doctors
  getHrDoctors() {
    return firstValueFrom(this.http.get<{ doctors: Array<any> }>(`${this.apiBase}${API_PATHS.HR.DOCTORS}`));
  }

  getHrDoctor(id: string) {
    return firstValueFrom(this.http.get<{ doctor: any }>(`${this.apiBase}${API_PATHS.HR.DOCTORS}/${id}`));
  }

  updateHrDoctor(id: string, data: Record<string, unknown>) {
    return firstValueFrom(this.http.put<{ doctor: any }>(`${this.apiBase}${API_PATHS.HR.DOCTORS}/${id}`, data));
  }

  generateDoctorLetter(id: string, clinicName?: string, clinicAddress?: string) {
    return firstValueFrom(
      this.http.post<{ letter: any }>(`${this.apiBase}${API_PATHS.HR.DOCTORS}/${id}/letter`, { clinicName, clinicAddress })
    );
  }

  createHrUser(payload: { name: string; email: string; password: string; designation?: string; department?: string }) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.HR.USERS}`, payload));
  }

  getHrUsers() {
    return firstValueFrom(this.http.get<{ hrUsers: any[] }>(`${this.apiBase}${API_PATHS.HR.USERS}`));
  }

  setHrUserStatus(id: string, isActive: boolean) {
    return firstValueFrom(this.http.patch(`${this.apiBase}${API_PATHS.HR.USERS}/${id}/status`, { isActive }));
  }

  getDoctorLetter(id: string) {
    return firstValueFrom(this.http.get<{ letter: any }>(`${this.apiBase}${API_PATHS.HR.DOCTORS}/${id}/letter`));
  }

  // HR Store Access Management
  getHrUserStores(hrUserId: string) {
    return firstValueFrom(
      this.http.get<{ assigned: any[]; all: any[] }>(`${this.apiBase}${API_PATHS.HR.USERS}/${hrUserId}/stores`)
    );
  }

  grantHrStoreAccess(hrUserId: string, storeId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.HR.USERS}/${hrUserId}/stores`, { storeId }));
  }

  revokeHrStoreAccess(hrUserId: string, storeId: string) {
    return firstValueFrom(this.http.delete(`${this.apiBase}${API_PATHS.HR.USERS}/${hrUserId}/stores/${storeId}`));
  }

  grantAllStores(hrUserId: string) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.HR.USERS}/${hrUserId}/stores/all`, {}));
  }

  // HR — Employees (unified)
  getHrEmployees(params: { q?: string; type?: string; status?: string }) {
    return firstValueFrom(
      this.http.get<{ employees: Array<any>; total: number }>(`${this.apiBase}${API_PATHS.HR.EMPLOYEES}`, {
        params: { q: params.q ?? '', type: params.type ?? FILTER_ALL, status: params.status ?? FILTER_ALL }
      })
    );
  }

  updateHrStoreStaff(id: string, data: Record<string, unknown>) {
    return firstValueFrom(this.http.put<{ staff: any }>(`${this.apiBase}${API_PATHS.HR.STORE_STAFF}/${id}`, data));
  }

  generateStoreStaffLetter(id: string) {
    return firstValueFrom(this.http.post<{ letter: any }>(`${this.apiBase}${API_PATHS.HR.STORE_STAFF}/${id}/letter`, {}));
  }

  getStoreStaffLetter(id: string) {
    return firstValueFrom(this.http.get<{ letter: any }>(`${this.apiBase}${API_PATHS.HR.STORE_STAFF}/${id}/letter`));
  }

  setDoctorAssignment(id: string, data: { isOnline: boolean; clinicStoreId?: string | null }) {
    return firstValueFrom(this.http.put(`${this.apiBase}${API_PATHS.HR.DOCTORS}/${id}/assignment`, data));
  }

  // HR — Leaves
  getAdminLeaves(params: { status?: string; empType?: string; page?: number; pageSize?: number }) {
    return firstValueFrom(
      this.http.get<{ leaves: Array<any>; total: number }>(`${this.apiBase}${API_PATHS.HR.LEAVES}`, {
        params: {
          status: params.status ?? FILTER_ALL,
          empType: params.empType ?? FILTER_ALL,
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.LEAVES)
        }
      })
    );
  }

  createAdminLeave(data: any) {
    return firstValueFrom(this.http.post<{ leave: any }>(`${this.apiBase}${API_PATHS.HR.LEAVES}`, data));
  }

  updateAdminLeave(id: string, data: { status: string; hrNote?: string }) {
    return firstValueFrom(this.http.patch<{ leave: any }>(`${this.apiBase}${API_PATHS.HR.LEAVES}/${id}`, data));
  }

  // HR — Stores
  getAdminStores() {
    return firstValueFrom(this.http.get<{ stores: Array<any> }>(`${this.apiBase}${API_PATHS.HR.STORES}`));
  }

  createAdminStore(data: { name: string; code: string; address?: string; phone?: string }) {
    return firstValueFrom(this.http.post<{ store: any }>(`${this.apiBase}${API_PATHS.HR.STORES}`, data));
  }

  getAdminStore(storeId: string) {
    return firstValueFrom(this.http.get<{ store: any }>(`${this.apiBase}${API_PATHS.HR.STORES}/${storeId}`));
  }

  updateAdminStore(
    storeId: string,
    data: { name?: string; address?: string; phone?: string; isActive?: boolean }
  ) {
    return firstValueFrom(
      this.http.patch<{ store: any }>(`${this.apiBase}${API_PATHS.HR.STORES}/${storeId}`, data)
    );
  }

  createAdminManager(storeId: string, data: any) {
    return firstValueFrom(this.http.post<{ manager: any }>(`${this.apiBase}${API_PATHS.HR.STORES}/${storeId}/managers`, data));
  }

  createAdminStoreStaff(storeId: string, data: any) {
    return firstValueFrom(this.http.post<{ staff: any }>(`${this.apiBase}${API_PATHS.HR.STORES}/${storeId}/staff`, data));
  }

  setAdminStoreStaffStatus(id: string, data: any) {
    return firstValueFrom(this.http.patch(`${this.apiBase}${API_PATHS.HR.STORE_STAFF}/${id}/status`, data));
  }

  // Admin Consultations
  getAdminConsultations(params: { status?: string; assigned?: string; q?: string; page?: number; pageSize?: number }) {
    return firstValueFrom(
      this.http.get<{ consultations: any[]; total: number }>(`${this.apiBase}/admin/consultations`, {
        params: {
          status:   params.status   ?? '',
          assigned: params.assigned ?? '',
          q:        params.q        ?? '',
          page:     String(params.page     ?? 1),
          pageSize: String(params.pageSize ?? 20)
        }
      })
    );
  }

  assignConsultationDoctor(consultationId: string, doctorId: string) {
    return firstValueFrom(
      this.http.put<{ consultation: any }>(`${this.apiBase}/admin/consultations/${consultationId}/assign`, { doctorId })
    );
  }

  getPayroll(month: string) {
    return firstValueFrom(
      this.http.get<{ month: string; rows: Array<any>; summary: any }>(`${this.apiBase}${API_PATHS.HR.PAYROLL}`, {
        params: { month }
      })
    );
  }
}
