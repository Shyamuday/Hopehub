import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS } from '../core/constants/api-paths.constants';

@Injectable({ providedIn: 'root' })
export class WarehouseApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMe() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.WAREHOUSE.ME}`));
  }

  getDashboard() {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.WAREHOUSE.DASHBOARD}`));
  }

  getBranches() {
    return firstValueFrom(this.http.get<{ branches: any[] }>(`${this.base}${API_PATHS.WAREHOUSE.BRANCHES}`));
  }

  getTransfers(status?: string) {
    const params = status ? { status } : undefined;
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.WAREHOUSE.TRANSFERS}`, { params }));
  }

  getTransfer(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.base}${API_PATHS.WAREHOUSE.TRANSFER(id)}`));
  }

  createTransfer(payload: {
    toStoreId: string;
    notes?: string;
    lines: Array<{ medicineId: string; qtyRequested: number }>;
  }) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.WAREHOUSE.TRANSFERS}`, payload));
  }

  dispatchTransfer(
    id: string,
    lines: Array<{ transferLineId: string; qtyDispatched: number; sourceBatchId: string }>
  ) {
    return firstValueFrom(this.http.post<any>(`${this.base}${API_PATHS.WAREHOUSE.DISPATCH(id)}`, { lines }));
  }
}
