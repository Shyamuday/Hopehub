import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
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
  StockMovement
} from '../models';

@Injectable({ providedIn: 'root' })
export class StoreApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/store`;

  // Auth
  loginPin(staffId: string, pin: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, { staffId, pin });
  }

  loginManager(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/manager-login`, { email, password });
  }

  // Dashboard
  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/dashboard`);
  }

  // Medicines
  getMedicines(query?: { q?: string; potency?: string; page?: number; pageSize?: number }): Observable<MedicinesResponse> {
    let params = new HttpParams();
    if (query?.q) params = params.set('q', query.q);
    if (query?.potency) params = params.set('potency', query.potency);
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.pageSize) params = params.set('pageSize', query.pageSize.toString());
    return this.http.get<MedicinesResponse>(`${this.base}/medicines`, { params });
  }

  getMedicine(id: string): Observable<MedicineDetailResponse> {
    return this.http.get<MedicineDetailResponse>(`${this.base}/medicines/${id}`);
  }

  createMedicine(data: MedicineCreateRequest): Observable<{ medicine: Medicine }> {
    return this.http.post<{ medicine: Medicine }>(`${this.base}/medicines`, data);
  }

  updateMedicine(id: string, data: Partial<MedicineCreateRequest>): Observable<{ medicine: Medicine }> {
    return this.http.put<{ medicine: Medicine }>(`${this.base}/medicines/${id}`, data);
  }

  // Racks
  getRacks(): Observable<{ racks: StoreRack[] }> {
    return this.http.get<{ racks: StoreRack[] }>(`${this.base}/racks`);
  }

  createRack(data: RackCreateRequest): Observable<{ rack: StoreRack }> {
    return this.http.post<{ rack: StoreRack }>(`${this.base}/racks`, data);
  }

  // Stock
  addStock(data: StockAddRequest): Observable<{ stock: StockBatch }> {
    return this.http.post<{ stock: StockBatch }>(`${this.base}/stock/add`, data);
  }

  removeStock(data: StockRemoveRequest): Observable<{ movement: StockMovement }> {
    return this.http.post<{ movement: StockMovement }>(`${this.base}/stock/remove`, data);
  }

  // Alerts
  getLowStockAlerts(): Observable<AlertsLowStockResponse> {
    return this.http.get<AlertsLowStockResponse>(`${this.base}/alerts/low-stock`);
  }

  getExpiringAlerts(days = 30): Observable<AlertsExpiringResponse> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<AlertsExpiringResponse>(`${this.base}/alerts/expiring`, { params });
  }

  // Movements
  getMovements(page = 1, pageSize = 20): Observable<MovementsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<MovementsResponse>(`${this.base}/movements`, { params });
  }
}
