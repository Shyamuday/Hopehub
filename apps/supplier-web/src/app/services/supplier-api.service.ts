import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class SupplierApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.SUPPLIER.ME}`));
  }

  getOrders(status?: string) {
    const params = status ? { status } : undefined;
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.SUPPLIER.ORDERS}`, { params }));
  }

  getOrder(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.SUPPLIER.ORDER(id)}`));
  }

  confirmOrder(id: string, data: { supplierNotes?: string; expectedDeliveryDate?: string }) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.SUPPLIER.CONFIRM(id)}`, data));
  }
}
