import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_EXPORT_FORMAT, API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';
import type { PaymentStatus } from '../../../features/dashboard/constants/payments.constants';

import { AdminApiBase } from './admin-api-base';

@Injectable({ providedIn: 'root' })
export class AdminReportsApi extends AdminApiBase {
  constructor(http: HttpClient, auth: AdminAuth) {
    super(http, auth);
  }

  getReports() {
    return firstValueFrom(this.http.get(`${this.apiBase}${API_PATHS.ADMIN.REPORTS}`));
  }

  getAuditLogs(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    action?: string;
    targetType?: string;
  } = {}) {
    const query: Record<string, string> = {
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? PAGE_SIZES.AUDIT_LOGS_API_DEFAULT)
    };
    if (params.q?.trim()) query['q'] = params.q.trim();
    if (params.action?.trim()) query['action'] = params.action.trim();
    if (params.targetType?.trim()) query['targetType'] = params.targetType.trim();

    return firstValueFrom(
      this.http.get<{ logs: Array<any>; pagination: any }>(`${this.apiBase}${API_PATHS.ADMIN.AUDIT_LOGS}`, {
        params: query
      })
    );
  }

  getAdherenceRisk(params: { days?: number; minDoses?: number } = {}) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.ADHERENCE_RISK}`, {
        params: {
          days: String(params.days ?? 7),
          minDoses: String(params.minDoses ?? 5)
        }
      })
    );
  }

  getPayments(params: {
    page?: number;
    pageSize?: number;
    status?: PaymentStatus;
    from?: string;
    to?: string;
  }) {
    return firstValueFrom(
      this.http.get<{
        payments: Array<any>;
        summary: { total: number; paid: number; failedCount: number; pendingCount: number };
        pagination: any;
      }>(`${this.apiBase}${API_PATHS.ADMIN.PAYMENTS}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.PAYMENTS),
          status: params.status ?? FILTER_ALL,
          from: params.from ?? '',
          to: params.to ?? ''
        }
      })
    );
  }

  async exportPaymentsCsv(params: {
    status?: PaymentStatus;
    from?: string;
    to?: string;
  }) {
    const query = new URLSearchParams({
      status: params.status ?? FILTER_ALL,
      export: API_EXPORT_FORMAT.CSV
    });
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const response = await fetch(`${this.apiBase}${API_PATHS.ADMIN.PAYMENTS}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${this.auth.token()}` }
    });
    if (!response.ok) {
      throw new Error('Could not export payments CSV.');
    }
    return response.text();
  }
}
