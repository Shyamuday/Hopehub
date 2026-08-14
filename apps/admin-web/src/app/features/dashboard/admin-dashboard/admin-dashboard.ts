import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { adminNavPath, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { AdminWorkspaceService } from '../../../core/services/admin-workspace.service';
import { AdminAuth } from '../../../core/services/admin-auth';
import { canUserAccessAdminRoute } from '../../../core/admin-navigation';
import { formatAuditAction } from '../../audit/constants/audit.constants';
import { buildAdminDashboardStatFields } from '../constants/dashboard-stat.fields';
import {
  AUDIT_LOGS_PAGE_SIZE,
  PAYMENTS_DEFAULTS,
  PAYMENTS_PAGE_SIZE,
  type PaymentStatus,
} from '../constants/payments.constants';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormField, RouterLink, DetailRowsComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {
  private readonly workspace = inject(AdminWorkspaceService);
  private readonly auth = inject(AdminAuth);

  readonly auditPath = adminNavPath(ROUTE_PATHS.AUDIT);
  readonly adherencePath = adminNavPath(ROUTE_PATHS.ADHERENCE);
  readonly visitorLeadsPath = adminNavPath(ROUTE_PATHS.CHAT_INBOX);
  readonly providerApplicationsPath = adminNavPath(ROUTE_PATHS.COUNSELLOR_APPLICATIONS);
  readonly consultationsPath = adminNavPath(ROUTE_PATHS.CONSULTATIONS);
  readonly safetyFlagsPath = adminNavPath(ROUTE_PATHS.SAFETY_FLAGS);
  readonly providersPath = adminNavPath(ROUTE_PATHS.DOCTORS);
  readonly workspaceKey = this.workspace.selectedWorkspace;
  readonly workspaceLabel = this.workspace.workspaceLabel;
  readonly providerSingularLabel = this.workspace.providerSingularLabel;
  readonly providerPluralLabel = this.workspace.providerPluralLabel;
  readonly providerPluralTitleLabel = this.workspace.providerPluralTitleLabel;
  readonly consumerTitleLabel = this.workspace.consumerTitleLabel;
  readonly sessionSingularLabel = this.workspace.sessionSingularLabel;
  readonly sessionPluralLabel = this.workspace.sessionPluralLabel;
  readonly sessionPluralTitleLabel = this.workspace.sessionPluralTitleLabel;
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
  paymentSummary = { total: 0, paid: 0, failedCount: 0, pendingCount: 0 };
  paymentsLoading = false;
  paymentsError = '';
  csvExporting = false;
  csvError = '';
  error = '';
  adherenceSummary = {
    highRiskCount: 0,
    mediumRiskCount: 0,
    alertCount: 0,
    platformAdherencePercent: 0,
  };
  adherenceAlerts: Array<{ patientName: string; message: string; severity: string }> = [];
  visitorLeadStats = {
    total: 0,
    needsCallback: 0,
    newLeads: 0,
    called: 0,
    registered: 0,
    booked: 0,
    notInterested: 0,
  };
  private reportsLoaded = false;

  readonly paymentFilterModel = signal({
    paymentStatus: PAYMENTS_DEFAULTS.STATUS as PaymentStatus,
    paymentFrom: '',
    paymentTo: '',
  });
  readonly paymentFilterForm = form(this.paymentFilterModel);

  constructor(private readonly api: AdminApi) {
    effect(() => {
      this.workspace.selectedWorkspace();
      const reloadOpenReports = this.reportsLoaded;
      this.reportsLoaded = false;
      this.payments = [];
      this.auditLogs = [];
      void this.load();
      if (reloadOpenReports) {
        this.reportsLoaded = true;
        void this.loadReports();
      }
    });
  }

  async load() {
    this.error = '';
    const tasks: Array<Promise<unknown>> = [];

    if (this.canAccess(ROUTE_PATHS.DASHBOARD)) {
      tasks.push(
        (async () => {
          try {
            const report = (await this.api.getReports({
              workspace: this.workspace.selectedWorkspace(),
            })) as {
              revenueInPaise: number;
              activeDoctors: number;
              consultations: Array<unknown>;
            };
            this.revenueInPaise = report.revenueInPaise || 0;
            this.activeDoctors = report.activeDoctors || 0;
            this.consultationsCount = report.consultations?.length || 0;
          } catch {
            this.error = 'Some dashboard summary data could not be loaded.';
          }
        })(),
      );
    }

    if (this.canAccess(ROUTE_PATHS.CHAT_INBOX)) {
      tasks.push(this.loadVisitorLeadStats());
    }

    await Promise.allSettled(tasks);
  }

  onReportsToggle(event: Event) {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open || this.reportsLoaded) return;
    this.reportsLoaded = true;
    void this.loadReports();
  }

  private async loadReports() {
    const tasks: Array<Promise<unknown>> = [];
    if (this.canAccess(ROUTE_PATHS.AUDIT)) tasks.push(this.loadAuditLogs());
    if (this.canAccess(ROUTE_PATHS.PAYMENTS)) tasks.push(this.loadPayments());
    if (
      this.workspace.selectedWorkspace() === 'homeopathy' &&
      this.canAccess(ROUTE_PATHS.ADHERENCE)
    ) {
      tasks.push(this.loadAdherenceSummary());
    }
    await Promise.allSettled(tasks);
  }

  async loadPayments(page = this.paymentsPage) {
    this.paymentsPage = page;
    this.paymentsLoading = true;
    this.paymentsError = '';
    const filters = this.paymentFilterModel();
    try {
      const result = await this.api.getPayments({
        page,
        pageSize: PAYMENTS_PAGE_SIZE,
        status: filters.paymentStatus,
        from: filters.paymentFrom || undefined,
        to: filters.paymentTo || undefined,
        workspace: this.workspace.selectedWorkspace(),
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
    this.paymentFilterModel.set({
      paymentStatus: PAYMENTS_DEFAULTS.STATUS,
      paymentFrom: '',
      paymentTo: '',
    });
    void this.loadPayments(1);
  }

  paymentPages() {
    return Array.from({ length: this.paymentsTotalPages }, (_, i) => i + 1);
  }

  async exportPaymentsCsv() {
    this.csvExporting = true;
    this.csvError = '';
    const filters = this.paymentFilterModel();
    try {
      const csv = await this.api.exportPaymentsCsv({
        status: filters.paymentStatus,
        from: filters.paymentFrom || undefined,
        to: filters.paymentTo || undefined,
        workspace: this.workspace.selectedWorkspace(),
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
        platformAdherencePercent: report.summary?.platformAdherencePercent ?? 0,
      };
      this.adherenceAlerts = (report.alerts ?? []).slice(0, 3);
    } catch {
      this.adherenceAlerts = [];
    }
  }

  private async loadVisitorLeadStats() {
    try {
      const res = await this.api.getVisitorLeadStats();
      this.visitorLeadStats = {
        total: res.stats.total ?? 0,
        needsCallback: res.stats.needsCallback ?? 0,
        newLeads: res.stats.newLeads ?? 0,
        called: res.stats.called ?? 0,
        registered: res.stats.registered ?? 0,
        booked: (res.stats as { booked?: number }).booked ?? 0,
        notInterested: (res.stats as { notInterested?: number }).notInterested ?? 0,
      };
    } catch {
      // optional dashboard block
    }
  }

  dashboardStatRows() {
    return buildDetailRows(
      {
        revenueInPaise: this.revenueInPaise,
        activeDoctors: this.activeDoctors,
        consultationsCount: this.consultationsCount,
      },
      buildAdminDashboardStatFields({
        providerPluralTitle: this.providerPluralTitleLabel(),
        sessionPluralTitle: this.sessionPluralTitleLabel(),
      }),
    );
  }

  private async loadAuditLogs() {
    try {
      const audit = await this.api.getAuditLogs({ page: 1, pageSize: AUDIT_LOGS_PAGE_SIZE });
      this.auditLogs = audit.logs || [];
    } catch {
      this.auditLogs = [];
    }
  }

  canAccess(segment: string): boolean {
    return canUserAccessAdminRoute(this.auth.user(), segment);
  }
}
