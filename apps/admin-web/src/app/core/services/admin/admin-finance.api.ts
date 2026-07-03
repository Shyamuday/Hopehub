import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';

import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminFinanceApi extends AdminApiBase {
  getFinanceSummary(month?: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.SUMMARY}`, {
        params: month ? { month } : {}
      })
    );
  }

  getRevenueTrend(months = 6) {
    return firstValueFrom(
      this.http.get<{ rows: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.REVENUE_TREND}`, {
        params: { months: String(months) }
      })
    );
  }

  getRevenueByDoctor(month?: string) {
    return firstValueFrom(
      this.http.get<{ rows: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.REVENUE_BY_DOCTOR}`, {
        params: month ? { month } : {}
      })
    );
  }

  getRevenueByDisease(month?: string) {
    return firstValueFrom(
      this.http.get<{ rows: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.REVENUE_BY_DISEASE}`, {
        params: month ? { month } : {}
      })
    );
  }

  getOutstandingPayments() {
    return firstValueFrom(
      this.http.get<{ payments: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.OUTSTANDING}`)
    );
  }

  getMedicineRevenue(params: { from?: string; to?: string; storeId?: string }) {
    return firstValueFrom(
      this.http.get<{ movements: Array<any>; totalInPaise: number; count: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.FINANCE.MEDICINE_REVENUE}`,
        { params: { from: params.from ?? '', to: params.to ?? '', storeId: params.storeId ?? '' } }
      )
    );
  }

  getPayslip(type: string, id: string, month: string) {
    return firstValueFrom(
      this.http.get<{ payslip: any }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.PAYSLIP(type, id)}`, {
        params: { month }
      })
    );
  }

  getExpenses(params: { level?: string; storeId?: string; category?: string; from?: string; to?: string }) {
    return firstValueFrom(
      this.http.get<{ expenses: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.EXPENSES}`, {
        params: {
          level: params.level ?? '',
          storeId: params.storeId ?? '',
          category: params.category ?? '',
          from: params.from ?? '',
          to: params.to ?? ''
        }
      })
    );
  }

  getExpenseSummary(month: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.EXPENSES_SUMMARY}`, { params: { month } })
    );
  }

  createExpense(data: Record<string, unknown>) {
    return firstValueFrom(this.http.post<{ expense: any }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.EXPENSES}`, data));
  }

  updateExpense(id: string, data: Record<string, unknown>) {
    return firstValueFrom(this.http.put<{ expense: any }>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.EXPENSES}/${id}`, data));
  }

  deleteExpense(id: string) {
    return firstValueFrom(this.http.delete(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.EXPENSES}/${id}`));
  }

  getBranchPnl(month?: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.FINANCE.BRANCHES}`, {
        params: month ? { month } : {}
      })
    );
  }

  async exportAccountantBundle(params: { month: string; storeId?: string }) {
    const query = new URLSearchParams({ month: params.month });
    if (params.storeId) query.set('storeId', params.storeId);
    const response = await fetch(
      `${this.apiBase}${API_PATHS.ADMIN.FINANCE.EXPORT_BUNDLE}?${query.toString()}`,
      { headers: { Authorization: `Bearer ${this.auth.token()}` } }
    );
    if (!response.ok) {
      throw new Error('Could not export accountant bundle.');
    }
    return response.text();
  }
}
