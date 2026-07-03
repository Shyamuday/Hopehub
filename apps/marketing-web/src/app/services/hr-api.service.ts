import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  DashboardData, Employee, Doctor, StoreStaff, StoreInfo,
  Leave, Letter, EmployeesResponse, LeavesResponse,
  LeaveStatus, EmpType, EmployeeStatus
} from '../models';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class HrApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Dashboard
  getDashboard() {
    return this.http.get<DashboardData>(`${this.base}${API_PATHS.HR.DASHBOARD}`);
  }

  // Employees
  getEmployees(params: { q?: string; type?: string; status?: string } = {}) {
    let p = new HttpParams();
    if (params.q) p = p.set('q', params.q);
    if (params.type) p = p.set('type', params.type);
    if (params.status) p = p.set('status', params.status);
    return this.http.get<EmployeesResponse>(`${this.base}${API_PATHS.HR.EMPLOYEES}`, { params: p });
  }

  // Doctors
  getDoctors() {
    return this.http.get<{ doctors: Doctor[] }>(`${this.base}${API_PATHS.HR.DOCTORS}`);
  }

  getDoctor(id: string) {
    return this.http.get<{ doctor: Doctor }>(`${this.base}${API_PATHS.HR.DOCTORS}/${id}`);
  }

  updateDoctor(id: string, data: Partial<Employee>) {
    return this.http.put<{ doctor: Doctor }>(`${this.base}${API_PATHS.HR.DOCTORS}/${id}`, data);
  }

  generateDoctorLetter(id: string, opts: { clinicName?: string; clinicAddress?: string } = {}) {
    return this.http.post<{ letter: Letter }>(`${this.base}${API_PATHS.HR.DOCTORS}/${id}/letter`, opts);
  }

  getDoctorLetter(id: string) {
    return this.http.get<{ letter: Letter }>(`${this.base}${API_PATHS.HR.DOCTORS}/${id}/letter`);
  }

  // Store Staff
  getStoreStaff() {
    return this.http.get<{ staff: StoreStaff[] }>(`${this.base}${API_PATHS.HR.STORE_STAFF}`);
  }

  getStoreStaffById(id: string) {
    return this.http.get<{ staff: StoreStaff }>(`${this.base}${API_PATHS.HR.STORE_STAFF}/${id}`);
  }

  updateStoreStaff(id: string, data: Partial<Employee>) {
    return this.http.put<{ staff: StoreStaff }>(`${this.base}${API_PATHS.HR.STORE_STAFF}/${id}`, data);
  }

  generateStoreStaffLetter(id: string) {
    return this.http.post<{ letter: Letter }>(`${this.base}${API_PATHS.HR.STORE_STAFF}/${id}/letter`, {});
  }

  getStoreStaffLetter(id: string) {
    return this.http.get<{ letter: Letter }>(`${this.base}${API_PATHS.HR.STORE_STAFF}/${id}/letter`);
  }

  // Leaves
  getLeaves(params: { status?: string; empType?: string; page?: number; pageSize?: number } = {}) {
    let p = new HttpParams();
    if (params.status) p = p.set('status', params.status);
    if (params.empType) p = p.set('empType', params.empType);
    if (params.page) p = p.set('page', params.page.toString());
    if (params.pageSize) p = p.set('pageSize', params.pageSize.toString());
    return this.http.get<LeavesResponse>(`${this.base}${API_PATHS.HR.LEAVES}`, { params: p });
  }

  createLeave(data: {
    employeeType: EmpType;
    doctorId?: string;
    storeStaffId?: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    return this.http.post<{ leave: Leave }>(`${this.base}${API_PATHS.HR.LEAVES}`, data);
  }

  updateLeave(id: string, data: { status: LeaveStatus; hrNote?: string }) {
    return this.http.patch<{ leave: Leave }>(`${this.base}${API_PATHS.HR.LEAVES}/${id}`, data);
  }

  // Stores
  getStores() {
    return this.http.get<{ stores: StoreInfo[] }>(`${this.base}${API_PATHS.HR.STORES}`);
  }

  createStore(data: { name: string; code: string; address?: string; phone?: string }) {
    return this.http.post<{ store: StoreInfo }>(`${this.base}${API_PATHS.HR.STORES}`, data);
  }

  createManager(storeId: string, data: { name: string; email: string; password: string; designation?: string; joiningDate?: string }) {
    return this.http.post<{ staff: StoreStaff }>(`${this.base}${API_PATHS.HR.STORES}/${storeId}/managers`, data);
  }

  createStoreStaff(storeId: string, data: { name: string; staffCode: string; pin: string; designation?: string; phone?: string; joiningDate?: string }) {
    return this.http.post<{ staff: StoreStaff }>(`${this.base}${API_PATHS.HR.STORES}/${storeId}/staff`, data);
  }

  setStoreStaffStatus(id: string, data: { isActive?: boolean; employeeStatus?: string }) {
    return this.http.patch<{ staff: StoreStaff }>(`${this.base}${API_PATHS.HR.STORE_STAFF}/${id}/status`, data);
  }
}
