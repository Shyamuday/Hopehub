import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { AdminPageHeaderComponent } from '../../../shared/ui/admin-page-header.component';

@Component({
  selector: 'app-security-page',
  imports: [FormField, DatePipe, FormsModule, AdminPageHeaderComponent],
  templateUrl: './security-page.html',
  styleUrl: './security-page.scss',
})
export class SecurityPage implements OnInit {
  private api = inject(AdminApi);

  tab = signal<'rbac' | 'retention' | 'auth'>('rbac');
  loading = signal(true);
  authLoading = signal(false);
  saving = signal(false);
  error = signal('');
  authError = signal('');
  toast = signal('');

  roles = signal<string[]>([]);
  capabilities = signal<Array<{ id: string; label: string; description: string; roles: string[] }>>(
    [],
  );
  matrix = signal<Array<{ role: string; capabilities: string[] }>>([]);

  retention = signal<{
    total: number;
    olderThan30Days: number;
    olderThan90Days: number;
    olderThan365Days: number;
    oldestAt: string | null;
  } | null>(null);

  readonly purgeModel = signal({ days: 90 });
  readonly purgeForm = form(this.purgeModel);
  authLogs = signal<Array<any>>([]);
  authLogPage = signal(1);
  authLogTotal = signal(0);
  authLogPageSize = signal(20);
  authSearch = signal('');
  authStatus = signal('');
  authReason = signal('');
  sessionLoading = signal(false);
  sessionError = signal('');
  sessions = signal<Array<any>>([]);
  sessionPage = signal(1);
  sessionTotal = signal(0);
  sessionPageSize = signal(20);
  sessionSearch = signal('');
  sessionStatus = signal('active');
  readonly headerMetrics = computed(() => [
    { label: 'Roles', value: this.roles().length },
    { label: 'Capabilities', value: this.capabilities().length },
    {
      label: 'Audit records',
      value: this.retention()?.total ?? 0,
      tone: 'default' as const,
    },
  ]);

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [rbac, stats] = await Promise.all([
        this.api.getRbacMatrix(),
        this.api.getAuditRetentionStats(),
      ]);
      this.roles.set(rbac.roles);
      this.capabilities.set(rbac.capabilities);
      this.matrix.set(rbac.matrix);
      this.retention.set(stats);
    } catch {
      this.error.set('Could not load security settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadAuthLogs(page = this.authLogPage()) {
    this.authLoading.set(true);
    this.authError.set('');
    try {
      const response = await this.api.getAuthProcessLogs({
        page,
        pageSize: this.authLogPageSize(),
        q: this.authSearch(),
        status: this.authStatus(),
        reason: this.authReason(),
      });
      this.authLogs.set(response.logs);
      this.authLogPage.set(response.page);
      this.authLogPageSize.set(response.pageSize);
      this.authLogTotal.set(response.total);
    } catch {
      this.authError.set('Could not load auth process logs.');
    } finally {
      this.authLoading.set(false);
    }
  }

  async loadSessions(page = this.sessionPage()) {
    this.sessionLoading.set(true);
    this.sessionError.set('');
    try {
      const response = await this.api.getAuthSessions({
        page,
        pageSize: this.sessionPageSize(),
        q: this.sessionSearch(),
        status: this.sessionStatus(),
      });
      this.sessions.set(response.sessions);
      this.sessionPage.set(response.page);
      this.sessionPageSize.set(response.pageSize);
      this.sessionTotal.set(response.total);
    } catch {
      this.sessionError.set('Could not load auth sessions.');
    } finally {
      this.sessionLoading.set(false);
    }
  }

  openAuthLogs() {
    this.tab.set('auth');
    if (!this.authLogs().length) void this.loadAuthLogs(1);
    if (!this.sessions().length) void this.loadSessions(1);
  }

  applyAuthFilters() {
    void this.loadAuthLogs(1);
  }

  resetAuthFilters() {
    this.authSearch.set('');
    this.authStatus.set('');
    this.authReason.set('');
    void this.loadAuthLogs(1);
  }

  goAuthLogPage(direction: -1 | 1) {
    const next = this.authLogPage() + direction;
    const totalPages = this.authTotalPages();
    if (next < 1 || next > totalPages) return;
    void this.loadAuthLogs(next);
  }

  applySessionFilters() {
    void this.loadSessions(1);
  }

  resetSessionFilters() {
    this.sessionSearch.set('');
    this.sessionStatus.set('active');
    void this.loadSessions(1);
  }

  goSessionPage(direction: -1 | 1) {
    const next = this.sessionPage() + direction;
    const totalPages = this.sessionTotalPages();
    if (next < 1 || next > totalPages) return;
    void this.loadSessions(next);
  }

  sessionTotalPages() {
    return Math.max(1, Math.ceil(this.sessionTotal() / this.sessionPageSize()));
  }

  async revokeSession(session: any) {
    if (!session?.id || session.status !== 'active') return;
    if (!confirm(`Revoke this session for ${session.user?.name || session.userId || 'this user'}?`))
      return;
    this.saving.set(true);
    try {
      await this.api.revokeAuthSession(session.id);
      this.showToast('Session revoked.');
      await this.loadSessions(this.sessionPage());
    } catch (e: any) {
      this.sessionError.set(e?.error?.message || 'Could not revoke session.');
    } finally {
      this.saving.set(false);
    }
  }

  async revokeUserSessions(session: any) {
    if (!session?.userId) return;
    if (
      !confirm(
        `Revoke every active session for ${session.user?.name || session.userId}? The user will need to sign in again.`,
      )
    )
      return;
    this.saving.set(true);
    try {
      const response = await this.api.revokeUserAuthSessions(session.userId);
      this.showToast(`Revoked ${response.revokedCount} session(s).`);
      await this.loadSessions(this.sessionPage());
    } catch (e: any) {
      this.sessionError.set(e?.error?.message || 'Could not revoke user sessions.');
    } finally {
      this.saving.set(false);
    }
  }

  authTotalPages() {
    return Math.max(1, Math.ceil(this.authLogTotal() / this.authLogPageSize()));
  }

  hasCapability(role: string, capabilityId: string) {
    return (
      this.matrix()
        .find((row) => row.role === role)
        ?.capabilities.includes(capabilityId) ?? false
    );
  }

  async dryRunPurge() {
    await this.purge(true);
  }

  async purge(dryRun = false) {
    if (
      !dryRun &&
      !confirm(`Permanently delete audit logs older than ${this.purgeModel().days} days?`)
    )
      return;
    this.saving.set(true);
    this.error.set('');
    try {
      const result = await this.api.purgeAuditLogs({
        olderThanDays: this.purgeModel().days,
        dryRun,
      });
      const msg = dryRun
        ? `Dry run: ${result.deletedCount} logs would be deleted.`
        : `Purged ${result.deletedCount} logs.`;
      this.showToast(msg);
      if (!dryRun) await this.load();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Purge failed.');
    } finally {
      this.saving.set(false);
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
