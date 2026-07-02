import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  StaffHrProfile,
  JoiningLetterDoc,
  AuthResponse,
  Medicine,
  MedicineWithStock,
  MedicinesResponse,
  MovementsResponse,
  DashboardStats,
  StoreRack,
  StockBatch,
  StockAddRequest,
  StockRemoveRequest,
  RackCreateRequest,
  MedicineCreateRequest,
  MedicineDetailResponse,
  AlertsLowStockResponse,
  AlertsExpiringResponse,
  StockMovement,
  StaffActivityResponse,
  StaffDetailResponse
} from '../models';
import { API_BASE, HR_API_PATHS, STORE_API_PATHS } from '../core/constants/api-paths.constants';
import { ACTIVITY_PERIODS, DEFAULT_PAGE, EXPIRING_ALERTS_DEFAULT_DAYS, PAGE_SIZES } from '../core/constants/pagination.constants';

@Injectable({ providedIn: 'root' })
export class StoreApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}${API_BASE.STORE}`;
  private hrBase = `${environment.apiUrl}${API_BASE.HR}`;

  // Auth
  loginPin(staffId: string, pin: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}${STORE_API_PATHS.AUTH.LOGIN}`, { staffId, pin });
  }

  loginManager(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}${STORE_API_PATHS.AUTH.MANAGER_LOGIN}`, { email, password });
  }

  // Dashboard
  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}${STORE_API_PATHS.DASHBOARD}`);
  }

  // Medicines
  getMedicines(query?: { q?: string; potency?: string; page?: number; pageSize?: number }): Observable<MedicinesResponse> {
    let params = new HttpParams();
    if (query?.q) params = params.set('q', query.q);
    if (query?.potency) params = params.set('potency', query.potency);
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.pageSize) params = params.set('pageSize', query.pageSize.toString());
    return this.http.get<MedicinesResponse>(`${this.base}${STORE_API_PATHS.MEDICINES}`, { params });
  }

  getMedicine(id: string): Observable<MedicineDetailResponse> {
    return this.http.get<MedicineDetailResponse>(`${this.base}${STORE_API_PATHS.MEDICINES}/${id}`);
  }

  createMedicine(data: MedicineCreateRequest): Observable<{ medicine: Medicine }> {
    return this.http.post<{ medicine: Medicine }>(`${this.base}${STORE_API_PATHS.MEDICINES}`, data);
  }

  updateMedicine(id: string, data: Partial<MedicineCreateRequest>): Observable<{ medicine: Medicine }> {
    return this.http.put<{ medicine: Medicine }>(`${this.base}${STORE_API_PATHS.MEDICINES}/${id}`, data);
  }

  // Racks
  getRacks(): Observable<{ racks: StoreRack[] }> {
    return this.http.get<{ racks: StoreRack[] }>(`${this.base}${STORE_API_PATHS.RACKS}`);
  }

  createRack(data: RackCreateRequest): Observable<{ rack: StoreRack }> {
    return this.http.post<{ rack: StoreRack }>(`${this.base}${STORE_API_PATHS.RACKS}`, data);
  }

  // Stock
  addStock(data: StockAddRequest): Observable<{ stock: StockBatch }> {
    return this.http.post<{ stock: StockBatch }>(`${this.base}${STORE_API_PATHS.STOCK.ADD}`, data);
  }

  removeStock(data: StockRemoveRequest): Observable<{ movement: StockMovement }> {
    return this.http.post<{ movement: StockMovement }>(`${this.base}${STORE_API_PATHS.STOCK.REMOVE}`, data);
  }

  // Alerts
  getLowStockAlerts(): Observable<AlertsLowStockResponse> {
    return this.http.get<AlertsLowStockResponse>(`${this.base}${STORE_API_PATHS.ALERTS.LOW_STOCK}`);
  }

  getExpiringAlerts(days = EXPIRING_ALERTS_DEFAULT_DAYS): Observable<AlertsExpiringResponse> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<AlertsExpiringResponse>(`${this.base}${STORE_API_PATHS.ALERTS.EXPIRING}`, { params });
  }

  // Movements
  getMovements(page = DEFAULT_PAGE, pageSize = PAGE_SIZES.MOVEMENTS): Observable<MovementsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<MovementsResponse>(`${this.base}${STORE_API_PATHS.MOVEMENTS}`, { params });
  }

  // Staff Activity
  getStaffActivity(period = ACTIVITY_PERIODS.TODAY): Observable<StaffActivityResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<StaffActivityResponse>(`${this.base}${STORE_API_PATHS.STAFF.ACTIVITY}`, { params });
  }

  getStaffDetail(staffId: string, period = ACTIVITY_PERIODS.WEEK): Observable<StaffDetailResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<StaffDetailResponse>(`${this.base}${STORE_API_PATHS.STAFF.DETAIL_ACTIVITY(staffId)}`, { params });
  }

  // HR — Staff
  getHrStaffList(): Observable<{ staff: StaffHrProfile[] }> {
    return this.http.get<{ staff: StaffHrProfile[] }>(`${this.hrBase}${HR_API_PATHS.STORE_STAFF}`);
  }

  getHrStaff(id: string): Observable<{ staff: StaffHrProfile }> {
    return this.http.get<{ staff: StaffHrProfile }>(`${this.hrBase}${HR_API_PATHS.STORE_STAFF}/${id}`);
  }

  updateHrStaff(id: string, data: Partial<StaffHrProfile>): Observable<{ staff: StaffHrProfile }> {
    return this.http.put<{ staff: StaffHrProfile }>(`${this.hrBase}${HR_API_PATHS.STORE_STAFF}/${id}`, data);
  }

  generateStaffLetter(id: string): Observable<{ letter: JoiningLetterDoc }> {
    return this.http.post<{ letter: JoiningLetterDoc }>(`${this.hrBase}${HR_API_PATHS.STORE_STAFF}/${id}/letter`, {});
  }

  getStaffLetter(id: string): Observable<{ letter: JoiningLetterDoc }> {
    return this.http.get<{ letter: JoiningLetterDoc }>(`${this.hrBase}${HR_API_PATHS.STORE_STAFF}/${id}/letter`);
  }

  getMyPayslip(month: string): Observable<{ payslip: any; history: any[] }> {
    const params = new HttpParams().set('month', month);
    return this.http.get<{ payslip: any; history: any[] }>(`${this.base}${STORE_API_PATHS.STAFF.MY_PAYSLIP}`, { params });
  }

  getStoreExpenses(category?: string): Observable<{ expenses: any[] }> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<{ expenses: any[] }>(`${this.base}${STORE_API_PATHS.EXPENSES}`, { params });
  }

  createStoreExpense(data: {
    category: string;
    description: string;
    vendor?: string;
    billNo?: string;
    amountInPaise: number;
    expenseDate: string;
  }): Observable<{ expense: any }> {
    return this.http.post<{ expense: any }>(`${this.base}${STORE_API_PATHS.EXPENSES}`, data);
  }

  scanPatient(patientCode: string): Observable<{
    patient: { id: string; name: string; patientCode?: string | null; mobile?: string | null };
    todayDoses: Array<{
      id: string;
      scheduledFor: string;
      status: string;
      medicineName: string;
      strength?: string | null;
      dose?: string | null;
      frequency?: string | null;
      instructions?: string | null;
    }>;
    pendingCount: number;
    prescription?: {
      id: string;
      diagnosis: string;
      items: Array<{
        medicineName: string;
        strength?: string | null;
        dose?: string | null;
        frequency?: string | null;
        duration?: string | null;
        instructions?: string | null;
      }>;
    } | null;
  }> {
    return this.http.get(`${this.base}${STORE_API_PATHS.SCAN_PATIENT(patientCode)}`);
  }

  searchPatients(q: string, scope: 'auto' | 'clinic' | 'global' = 'auto') {
    const params = new HttpParams().set('q', q).set('scope', scope);
    return this.http.get<{
      patients: Array<{
        id: string;
        name: string;
        patientCode?: string | null;
        mobile?: string | null;
        email?: string | null;
        homeClinicStore?: { id: string; name: string; code: string } | null;
      }>;
      scopeUsed: 'clinic' | 'global' | 'none';
    }>(`${this.base}${STORE_API_PATHS.PATIENTS.SEARCH}`, { params });
  }

  createPatient(payload: { name: string; mobile?: string; email?: string }) {
    return this.http.post<{
      patient: {
        id: string;
        name: string;
        patientCode?: string | null;
        mobile?: string | null;
      };
    }>(`${this.base}${STORE_API_PATHS.PATIENTS.CREATE}`, payload);
  }

  markDoseGiven(doseId: string) {
    return this.http.post<{ doseEvent: { id: string; status: string }; message: string }>(
      `${this.base}${STORE_API_PATHS.SCAN_DOSE_GIVE(doseId)}`,
      {}
    );
  }
}
