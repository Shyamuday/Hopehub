import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AccountantApiService } from '../../services/accountant-api.service';

function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormField],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private api = inject(AccountantApiService);

  loading = signal(true);
  error = signal('');
  exporting = signal(false);
  toast = signal('');

  readonly filterModel = signal({
    month: new Date().toISOString().slice(0, 7),
    branchExportFilter: ''
  });
  readonly filterForm = form(this.filterModel);

  summary = signal<any>(null);
  branchPnl = signal<any[]>([]);
  branchTotals = signal<any>(null);

  readonly formatPaise = formatPaise;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const month = this.filterModel().month;
    Promise.all([
      this.api.getSummary(month),
      this.api.getBranches(month)
    ])
      .then(([summary, branchData]) => {
        this.summary.set(summary);
        this.branchPnl.set(branchData.branches ?? []);
        this.branchTotals.set(branchData.totals ?? null);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load finance reports. Check your connection and try again.');
        this.loading.set(false);
      });
  }

  async exportBundle(): Promise<void> {
    this.exporting.set(true);
    const { month, branchExportFilter } = this.filterModel();
    try {
      const csv = await this.api.exportBundle({
        month,
        storeId: branchExportFilter || undefined
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const suffix = branchExportFilter ? `-${branchExportFilter}` : '';
      anchor.download = `accountant-bundle-${month}${suffix}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.showToast('Accountant bundle exported');
    } catch {
      this.showToast('Export failed');
    } finally {
      this.exporting.set(false);
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
