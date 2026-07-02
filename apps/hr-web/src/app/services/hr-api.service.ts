import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  DashboardData, Employee, Doctor, StoreStaff,
  Leave, Letter, EmployeesResponse, LeavesResponse,
  LeaveStatus, EmpType, EmployeeStatus
} from '../models';

@Injectable({ providedIn: 'root' })
export class HrApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Dashboard
  getDashboard() {
    return this.http.get<DashboardData>(`${this.base}/hr/dashboard`);
  }

  // Employees
  getEmployees(params: { q?: string; type?: string; status?: string } = {}) {
    let p = new HttpParams();
    if (params.q) p = p.set('q', params.q);
    if (params.type) p = p.set('type', params.type);
    if (params.status) p = p.set('status', params.status);
    return this.http.get<EmployeesResponse>(`${this.base}/hr/employees`, { params: p });
  }

  // Doctors
  getDoctors() {
    return this.http.get<{ doctors: Doctor[] }>(`${this.base}/hr/doctors`);
  }

  getDoctor(id: string) {
    return this.http.get<{ doctor: Doctor }>(`${this.base}/hr/doctors/${id}`);
  }

  updateDoctor(id: string, data: Partial<Doctor>) {
    return this.http.put<{ doctor: Doctor }>(`${this.base}/hr/doctors/${id}`, data);
  }

  generateDoctorLetter(id: string, opts: { clinicName?: string; clinicAddress?: string } = {}) {
    return this.http.post<{ letter: Letter }>(`${this.base}/hr/doctors/${id}/letter`, opts);
  }

  getDoctorLetter(id: string) {
    return this.http.get<{ letter: Letter }>(`${this.base}/hr/doctors/${id}/letter`);
  }

  // Store Staff
  getStoreStaff() {
    return this.http.get<{ staff: StoreStaff[] }>(`${this.base}/hr/store/staff`);
  }

  getStoreStaffById(id: string) {
    return this.http.get<{ staff: StoreStaff }>(`${this.base}/hr/store/staff/${id}`);
  }

  updateStoreStaff(id: string, data: Partial<StoreStaff>) {
    return this.http.put<{ staff: StoreStaff }>(`${this.base}/hr/store/staff/${id}`, data);
  }

  generateStoreStaffLetter(id: string) {
    return this.http.post<{ letter: Letter }>(`${this.base}/hr/store/staff/${id}/letter`, {});
  }

  getStoreStaffLetter(id: string) {
    return this.http.get<{ letter: Letter }>(`${this.base}/hr/store/staff/${id}/letter`);
  }

  // Leaves
  getLeaves(params: { status?: string; empType?: string; page?: number; pageSize?: number } = {}) {
    let p = new HttpParams();
    if (params.status) p = p.set('status', params.status);
    if (params.empType) p = p.set('empType', params.empType);
    if (params.page) p = p.set('page', params.page.toString());
    if (params.pageSize) p = p.set('pageSize', params.pageSize.toString());
    return this.http.get<LeavesResponse>(`${this.base}/hr/leaves`, { params: p });
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
    return this.http.post<{ leave: Leave }>(`${this.base}/hr/leaves`, data);
  }

  updateLeave(id: string, data: { status: LeaveStatus; hrNote?: string }) {
    return this.http.patch<{ leave: Leave }>(`${this.base}/hr/leaves/${id}`, data);
  }
}
