import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_EXPORT_FORMAT, API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';
import type { PaymentStatus } from '../../../features/dashboard/constants/payments.constants';

import { AdminApiBase } from './admin-api-base';

export type AdminPaymentSummary = {
  total: number;
  paid: number;
  refunded?: number;
  netPaid?: number;
  failedCount: number;
  pendingCount: number;
};

export type AdminPaymentEvent = {
  id: string;
  eventType: string;
  providerEventId?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amountInPaise?: number | null;
  currency?: string | null;
  status?: string | null;
  source: string;
  signatureVerified: boolean;
  receivedAt: string;
};

export type AdminPaymentRefund = {
  id: string;
  providerRefundId?: string | null;
  providerPaymentId: string;
  amountInPaise: number;
  status: string;
  reason?: string | null;
  processedByUserId?: string | null;
  createdAt: string;
};

export type FollowUpStatus =
  'AVAILABLE' | 'REQUESTED' | 'SCHEDULED' | 'USED' | 'EXPIRED' | 'CANCELLED';

@Service()
export class AdminReportsApi extends AdminApiBase {
  getReports() {
    return firstValueFrom(this.http.get(`${this.apiBase}${API_PATHS.ADMIN.REPORTS}`));
  }

  getAuditLogs(
    params: {
      page?: number;
      pageSize?: number;
      q?: string;
      action?: string;
      targetType?: string;
    } = {},
  ) {
    const query: Record<string, string> = {
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? PAGE_SIZES.AUDIT_LOGS_API_DEFAULT),
    };
    if (params.q?.trim()) query['q'] = params.q.trim();
    if (params.action?.trim()) query['action'] = params.action.trim();
    if (params.targetType?.trim()) query['targetType'] = params.targetType.trim();

    return firstValueFrom(
      this.http.get<{ logs: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.AUDIT_LOGS}`,
        {
          params: query,
        },
      ),
    );
  }

  getAuthProcessLogs(
    params: {
      page?: number;
      pageSize?: number;
      q?: string;
      status?: string;
      reason?: string;
    } = {},
  ) {
    return firstValueFrom(
      this.http.get<{ logs: Array<any>; page: number; pageSize: number; total: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.AUTH_PROCESS_LOGS}`,
        {
          params: {
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? PAGE_SIZES.AUDIT_LOGS_API_DEFAULT),
            ...(params.q?.trim() ? { q: params.q.trim() } : {}),
            ...(params.status?.trim() ? { status: params.status.trim() } : {}),
            ...(params.reason?.trim() ? { reason: params.reason.trim() } : {}),
          },
        },
      ),
    );
  }

  getAdherenceRisk(params: { days?: number; minDoses?: number } = {}) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.ADHERENCE_RISK}`, {
        params: {
          days: String(params.days ?? 7),
          minDoses: String(params.minDoses ?? 5),
        },
      }),
    );
  }

  getAnalyticsFunnels(params: { days?: number } = {}) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.ANALYTICS_FUNNELS}`, {
        params: { days: String(params.days ?? 30) },
      }),
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
        summary: AdminPaymentSummary;
        pagination: any;
      }>(`${this.apiBase}${API_PATHS.ADMIN.PAYMENTS}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.PAYMENTS),
          status: params.status ?? FILTER_ALL,
          from: params.from ?? '',
          to: params.to ?? '',
        },
      }),
    );
  }

  getDonations(params: {
    page?: number;
    pageSize?: number;
    status?: PaymentStatus | 'ALL';
    q?: string;
  }) {
    return firstValueFrom(
      this.http.get<{
        donations: Array<any>;
        summary: {
          paidAmountInPaise: number;
          paidCount: number;
          pendingAmountInPaise: number;
          pendingCount: number;
        };
        pagination: any;
      }>(`${this.apiBase}${API_PATHS.ADMIN.DONATIONS}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.PAYMENTS),
          status: params.status ?? FILTER_ALL,
          q: params.q ?? '',
        },
      }),
    );
  }

  getFollowUps(params: {
    page?: number;
    pageSize?: number;
    status?: FollowUpStatus | 'ALL';
    q?: string;
  }) {
    return firstValueFrom(
      this.http.get<{
        followUps: Array<any>;
        summary: { requested: number; available: number; scheduled: number };
        pagination: any;
      }>(`${this.apiBase}${API_PATHS.ADMIN.FOLLOW_UPS}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.PAYMENTS),
          status: params.status ?? FILTER_ALL,
          q: params.q ?? '',
        },
      }),
    );
  }

  updateFollowUp(
    id: string,
    payload: { status: FollowUpStatus; scheduledAt?: string | null; notes?: string | null },
  ) {
    return firstValueFrom(
      this.http.patch<{ followUp: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.FOLLOW_UP_BY_ID(id)}`,
        payload,
      ),
    );
  }

  getSafetyFlags(page = 1, pageSize = 20) {
    return firstValueFrom(
      this.http.get<{
        flags: any[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`${this.apiBase}${API_PATHS.ADMIN.SAFETY_FLAGS}`, {
        params: { page, pageSize },
      }),
    );
  }

  addSafetyFollowUp(consultationId: string, note: string) {
    return firstValueFrom(
      this.http.post<{ note: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.SAFETY_FLAG_NOTE(consultationId)}`,
        {
          note,
        },
      ),
    );
  }

  getPaymentEvents(paymentId: string) {
    return firstValueFrom(
      this.http.get<{ events: AdminPaymentEvent[]; refunds: AdminPaymentRefund[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.PAYMENT_EVENTS(paymentId)}`,
      ),
    );
  }

  refundPayment(
    paymentId: string,
    payload: {
      amountInPaise?: number;
      reason: string;
      speed?: 'normal' | 'optimum';
      cancelConsultation?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.post<{ refund: AdminPaymentRefund; payment: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.PAYMENT_REFUND(paymentId)}`,
        payload,
      ),
    );
  }

  async exportPaymentsCsv(params: { status?: PaymentStatus; from?: string; to?: string }) {
    const query = new URLSearchParams({
      status: params.status ?? FILTER_ALL,
      export: API_EXPORT_FORMAT.CSV,
    });
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const response = await fetch(`${this.apiBase}${API_PATHS.ADMIN.PAYMENTS}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${this.auth.token()}` },
    });
    if (!response.ok) {
      throw new Error('Could not export payments CSV.');
    }
    return response.text();
  }

  async exportAuditCsv(params: { q?: string; action?: string; targetType?: string }) {
    const query = new URLSearchParams({ export: API_EXPORT_FORMAT.CSV });
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.action?.trim()) query.set('action', params.action.trim());
    if (params.targetType?.trim()) query.set('targetType', params.targetType.trim());
    const response = await fetch(
      `${this.apiBase}${API_PATHS.ADMIN.AUDIT_LOGS}?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.auth.token()}` },
      },
    );
    if (!response.ok) {
      throw new Error('Could not export audit CSV.');
    }
    return response.text();
  }

  getAuditRetentionStats() {
    return firstValueFrom(
      this.http.get<{
        total: number;
        olderThan30Days: number;
        olderThan90Days: number;
        olderThan365Days: number;
        oldestAt: string | null;
      }>(`${this.apiBase}${API_PATHS.ADMIN.AUDIT_RETENTION_STATS}`),
    );
  }

  purgeAuditLogs(payload: { olderThanDays: number; dryRun?: boolean }) {
    return firstValueFrom(
      this.http.post<{
        dryRun: boolean;
        olderThanDays: number;
        deletedCount: number;
        cutoff: string;
      }>(`${this.apiBase}${API_PATHS.ADMIN.AUDIT_RETENTION_PURGE}`, payload),
    );
  }

  getRbacMatrix() {
    return firstValueFrom(
      this.http.get<{
        roles: string[];
        capabilities: Array<{ id: string; label: string; description: string; roles: string[] }>;
        matrix: Array<{ role: string; capabilities: string[] }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.RBAC_MATRIX}`),
    );
  }

  getPermissionPresets() {
    return firstValueFrom(
      this.http.get<{
        clusters: Record<string, string>;
        presets: Array<{
          id: string;
          label: string;
          summary: string;
          cluster: string;
          permissionCodes: string[];
        }>;
        governance: Record<string, string>;
        permissions: Array<{ code: string; label: string }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.PERMISSION_PRESETS}`),
    );
  }

  getStaff() {
    return firstValueFrom(
      this.http.get<{
        staff: Array<{
          id: string;
          name: string;
          email?: string | null;
          role: string;
          isActive?: boolean;
          staffProfile: { isSuperAdmin: boolean; permissionCodes: string[] } | null;
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.STAFF}`),
    );
  }

  updateStaff(userId: string, payload: { isSuperAdmin?: boolean; permissionCodes?: string[] }) {
    return firstValueFrom(
      this.http.put<{
        staffProfile: { userId: string; isSuperAdmin: boolean; permissionCodes: string[] };
      }>(`${this.apiBase}${API_PATHS.ADMIN.STAFF_BY_ID(userId)}`, payload),
    );
  }
}
