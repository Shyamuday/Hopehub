import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { formatAuditAction } from '../../audit/constants/audit.constants';
import {
  AUDIT_LOGS_PAGE_SIZE,
  PAYMENTS_DEFAULTS,
  PAYMENTS_PAGE_SIZE,
  type PaymentStatus
} from '../constants/payments.constants';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard {
  readonly auditPath = `/${ROUTE_PATHS.AUDIT}`;
  readonly adherencePath = `/${ROUTE_PATHS.ADHERENCE}`;
  readonly formatAuditAction = formatAuditAction;
  revenueInPaise = 0;
  activeDoctors = 0;
  consultationsCount = 0;
  auditLogs: Array<{
    id: string;
    action: string;
    actorRole?: string;
    targetType: string;
    targetId: string;
    summary?: string;
    createdAt: string;
    actor?: { id: string; name: string; email?: string | null } | null;
  }> = [];
  payments: Array<any> = [];
  paymentsPage = 1;
  paymentsTotalPages = 1;
  paymentStatus: PaymentStatus = PAYMENTS_DEFAULTS.STATUS;
  paymentFrom = '';
  paymentTo = '';
  paymentSummary = { total: 0, paid: 0, failedCount: 0, pendingCount: 0 };
  paymentsLoading = false;
  paymentsError = '';
  csvExporting = false;
  csvError = '';
  error = '';
  adherenceSummary = { highRiskCount: 0, mediumRiskCount: 0, alertCount: 0, platformAdherencePercent: 0 };
  adherenceAlerts: Array<{ patientName: string; message: string; severity: string }> = [];

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.error = '';
    try {
      const report = (await this.api.getReports()) as {
        revenueInPaise: number;
        activeDoctors: number;
        consultations: Array<unknown>;
      };
      this.revenueInPaise = report.revenueInPaise || 0;
      this.activeDoctors = report.activeDoctors || 0;
      this.consultationsCount = report.consultations?.length || 0;
      const audit = await this.api.getAuditLogs({ page: 1, pageSize: AUDIT_LOGS_PAGE_SIZE });
      this.auditLogs = audit.logs || [];
      await Promise.all([this.loadPayments(), this.loadAdherenceSummary()]);
    } catch {
      this.error = 'Could not load admin dashboard summary.';
    }
  }

  async loadPayments(page = this.paymentsPage) {
    this.paymentsPage = page;
    this.paymentsLoading = true;
    this.paymentsError = '';
    try {
      const result = await this.api.getPayments({
        page,
        pageSize: PAYMENTS_PAGE_SIZE,
        status: this.paymentStatus,
        from: this.paymentFrom || undefined,
        to: this.paymentTo || undefined
      });
      this.payments = result.payments || [];
      this.paymentSummary = result.summary || this.paymentSummary;
      this.paymentsTotalPages = result.pagination?.totalPages || 1;
    } catch {
      this.paymentsError = 'Could not load payments. Please try again.';
    } finally {
      this.paymentsLoading = false;
    }
  }

  async applyPaymentFilters() {
    await this.loadPayments(1);
  }

  clearPaymentFilters() {
    this.paymentStatus = PAYMENTS_DEFAULTS.STATUS;
    this.paymentFrom = '';
    this.paymentTo = '';
    void this.loadPayments(1);
  }

  paymentPages() {
    return Array.from({ length: this.paymentsTotalPages }, (_, i) => i + 1);
  }

  async exportPaymentsCsv() {
    this.csvExporting = true;
    this.csvError = '';
    try {
      const csv = await this.api.exportPaymentsCsv({
        status: this.paymentStatus,
        from: this.paymentFrom || undefined,
        to: this.paymentTo || undefined
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-${new Date().toISOString().substring(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.csvError = 'CSV export failed. Please try again.';
    } finally {
      this.csvExporting = false;
    }
  }

  private async loadAdherenceSummary() {
    try {
      const report = await this.api.getAdherenceRisk({ days: 7, minDoses: 5 });
      this.adherenceSummary = {
        highRiskCount: report.summary?.highRiskCount ?? 0,
        mediumRiskCount: report.summary?.mediumRiskCount ?? 0,
        alertCount: report.summary?.alertCount ?? 0,
        platformAdherencePercent: report.summary?.platformAdherencePercent ?? 0
      };
      this.adherenceAlerts = (report.alerts ?? []).slice(0, 3);
    } catch {
      this.adherenceAlerts = [];
    }
  }
}
