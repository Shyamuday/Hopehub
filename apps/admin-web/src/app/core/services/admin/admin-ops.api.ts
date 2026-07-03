import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { AdminApiBase } from './admin-api-base';

@Injectable({ providedIn: 'root' })
export class AdminOpsApi extends AdminApiBase {
  constructor(http: HttpClient, auth: AdminAuth) {
    super(http, auth);
  }

  searchPatients(q: string, params?: { clinicStoreId?: string; scope?: string }) {
    return firstValueFrom(
      this.http.get<{ patients: Array<any>; scopeUsed?: string; hint?: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.PATIENTS_SEARCH}`,
        {
          params: {
            q,
            ...(params?.clinicStoreId ? { clinicStoreId: params.clinicStoreId } : {}),
            ...(params?.scope ? { scope: params.scope } : {})
          }
        }
      )
    );
  }

  registerPatient(payload: {
    name: string;
    email?: string;
    mobile?: string;
    homeClinicStoreId?: string | null;
  }) {
    return firstValueFrom(
      this.http.post<{ patient: any }>(`${this.apiBase}${API_PATHS.ADMIN.PATIENTS}`, payload)
    );
  }

  getPurchaseOrders(params?: { status?: string; storeId?: string; supplierId?: string }) {
    return firstValueFrom(
      this.http.get<{ orders: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.PURCHASE_ORDERS}`, {
        params: {
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.storeId ? { storeId: params.storeId } : {}),
          ...(params?.supplierId ? { supplierId: params.supplierId } : {})
        }
      })
    );
  }

  getPurchaseOrder(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.PURCHASE_ORDERS}/${id}`));
  }

  createPurchaseOrder(payload: {
    supplierId: string;
    storeId: string;
    notes?: string;
    send?: boolean;
    lines: Array<{ medicineId: string; qtyOrdered: number; unitPriceInPaise: number }>;
  }) {
    return firstValueFrom(
      this.http.post<any>(`${this.apiBase}${API_PATHS.ADMIN.PURCHASE_ORDERS}`, payload)
    );
  }

  getSuppliers() {
    return firstValueFrom(
      this.http.get<{ suppliers: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.SUPPLIERS}`)
    );
  }

  searchMedicines(q: string, page = 1) {
    return firstValueFrom(
      this.http.get<{ medicines: Array<any>; pagination: { total: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.MEDICINES}`,
        { params: { q, page: String(page), pageSize: '20' } }
      )
    );
  }
}
