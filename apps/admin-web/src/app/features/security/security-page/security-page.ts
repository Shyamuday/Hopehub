import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

@Component({
  selector: 'app-security-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './security-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './security-page.scss'
})
export class SecurityPage implements OnInit {
  private api = inject(AdminApi);

  tab = signal<'rbac' | 'retention'>('rbac');
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  toast = signal('');

  roles = signal<string[]>([]);
  capabilities = signal<Array<{ id: string; label: string; description: string; roles: string[] }>>([]);
  matrix = signal<Array<{ role: string; capabilities: string[] }>>([]);

  retention = signal<{
    total: number;
    olderThan30Days: number;
    olderThan90Days: number;
    olderThan365Days: number;
    oldestAt: string | null;
  } | null>(null);
  purgeDays = 90;

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [rbac, stats] = await Promise.all([
        this.api.getRbacMatrix(),
        this.api.getAuditRetentionStats()
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

  hasCapability(role: string, capabilityId: string) {
    return this.matrix().find((row) => row.role === role)?.capabilities.includes(capabilityId) ?? false;
  }

  async dryRunPurge() {
    await this.purge(true);
  }

  async purge(dryRun = false) {
    this.saving.set(true);
    this.error.set('');
    try {
      const result = await this.api.purgeAuditLogs({ olderThanDays: this.purgeDays, dryRun });
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
