import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';
import { adminNavPath, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_PAGE_SIZE,
  AUDIT_TARGET_TYPE_OPTIONS,
  formatAuditAction
} from '../constants/audit.constants';

type AuditLog = {
  id: string;
  action: string;
  actorRole?: string | null;
  targetType: string;
  targetId: string;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; name: string; email?: string | null; role?: string } | null;
};

@Component({
  selector: 'app-audit-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './audit-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './audit-page.scss'
})
export class AuditPage {
  readonly actionOptions = AUDIT_ACTION_OPTIONS;
  readonly targetTypeOptions = AUDIT_TARGET_TYPE_OPTIONS;
  readonly formatAuditAction = formatAuditAction;
  readonly doctorsPath = adminNavPath(ROUTE_PATHS.DOCTORS);

  logs: AuditLog[] = [];
  page = 1;
  totalPages = 1;
  total = 0;
  searchTerm = '';
  actionFilter = '';
  targetTypeFilter = '';
  loading = false;
  error = '';
  expandedLogId = '';
  exporting = false;

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load(page = this.page) {
    this.page = page;
    this.loading = true;
    this.error = '';
    try {
      const response = await this.api.getAuditLogs({
        page,
        pageSize: AUDIT_PAGE_SIZE,
        q: this.searchTerm,
        action: this.actionFilter,
        targetType: this.targetTypeFilter
      });
      this.logs = response.logs || [];
      this.totalPages = response.pagination?.totalPages || 1;
      this.total = response.pagination?.total || 0;
    } catch {
      this.error = 'Could not load audit trail.';
      this.logs = [];
    } finally {
      this.loading = false;
    }
  }

  async applyFilters() {
    await this.load(1);
  }

  clearFilters() {
    this.searchTerm = '';
    this.actionFilter = '';
    this.targetTypeFilter = '';
    void this.load(1);
  }

  pages() {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  actorLabel(log: AuditLog) {
    if (log.actor?.name) {
      return log.actor.email ? `${log.actor.name} (${log.actor.email})` : log.actor.name;
    }
    return log.actorRole || 'SYSTEM';
  }

  toggleDetails(logId: string) {
    this.expandedLogId = this.expandedLogId === logId ? '' : logId;
  }

  metadataPreview(metadata: Record<string, unknown> | null | undefined) {
    if (!metadata) {
      return '';
    }
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  }

  async exportCsv() {
    this.exporting = true;
    try {
      const csv = await this.api.exportAuditCsv({
        q: this.searchTerm,
        action: this.actionFilter,
        targetType: this.targetTypeFilter
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.error = 'Could not export audit CSV.';
    } finally {
      this.exporting = false;
    }
  }
}
