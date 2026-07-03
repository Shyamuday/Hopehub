import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/services/admin-api';
import {
  EMPTY_EXPENSE_FORM,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  FINANCE_TABS,
  formatPaise,
  paiseToK,
  type FinanceTabId
} from '../constants/finance.constants';

@Component({
  selector: 'app-finance-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './finance-page.html',
  styleUrl: './finance-page.scss'
})
export class FinancePage implements OnInit {
  private api = inject(AdminApi);

  tab = signal<FinanceTabId>('overview');
  loading = signal(true);
  error = signal('');
  exporting = signal(false);
  branchExportFilter = '';
  selectedMonth = new Date().toISOString().slice(0, 7);
  toast = signal('');

  summary = signal<any>(null);
  branchPnl = signal<any[]>([]);
  branchTotals = signal<any>(null);
  trend = signal<any[]>([]);
  byDoctor = signal<any[]>([]);
  byDisease = signal<any[]>([]);
  medicine = signal<{ movements: any[]; totalInPaise: number }>({ movements: [], totalInPaise: 0 });
  clinicExpenses = signal<any[]>([]);
  storeExpenses = signal<any[]>([]);
  outstanding = signal<any[]>([]);
  stores = signal<any[]>([]);

  expenseModal = signal(false);
  editingExpense = signal<any | null>(null);
  expenseForm = { ...EMPTY_EXPENSE_FORM };
  storeFilter = '';
  medicineFrom = '';
  medicineTo = '';

  readonly tabs = FINANCE_TABS;
  readonly categories = EXPENSE_CATEGORIES;
  readonly categoryLabels = EXPENSE_CATEGORY_LABELS;
  readonly formatPaise = formatPaise;
  readonly paiseToK = paiseToK;

  ngOnInit(): void {
    this.loadStores();
    this.loadAll();
  }

  loadStores(): void {
    this.api.getAdminStores().then(r => this.stores.set(r.stores)).catch(() => {});
  }

  setTab(id: FinanceTabId): void {
    this.tab.set(id);
    this.loadTab();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set('');
    Promise.all([
      this.api.getFinanceSummary(this.selectedMonth),
      this.api.getBranchPnl(this.selectedMonth),
      this.api.getRevenueTrend(6),
      this.api.getRevenueByDoctor(this.selectedMonth),
      this.api.getRevenueByDisease(this.selectedMonth),
      this.api.getMedicineRevenue({ from: this.medicineFrom || undefined, to: this.medicineTo || undefined, storeId: this.storeFilter || undefined }),
      this.api.getExpenses({ level: 'CLINIC' }),
      this.api.getExpenses({ level: 'STORE', storeId: this.storeFilter || undefined })
    ]).then(([summary, branchData, trend, byDoctor, byDisease, medicine, clinicExpenses, storeExpenses]) => {
      this.summary.set(summary);
      this.branchPnl.set(branchData.branches ?? []);
      this.branchTotals.set(branchData.totals ?? null);
      this.trend.set(trend.rows);
      this.byDoctor.set(byDoctor.rows);
      this.byDisease.set(byDisease.rows);
      this.medicine.set(medicine);
      this.clinicExpenses.set(clinicExpenses.expenses);
      this.storeExpenses.set(storeExpenses.expenses);
      this.loading.set(false);
    }).catch(() => {
      this.error.set('Could not load finance data. Please try again.');
      this.loading.set(false);
    });
  }

  loadTab(): void {
    if (this.tab() === 'overview') {
      this.api.getFinanceSummary(this.selectedMonth).then(s => this.summary.set(s)).catch(() => {});
    }
    if (this.tab() === 'outstanding') {
      this.api.getOutstandingPayments().then(r => this.outstanding.set(r.payments || [])).catch(() => {});
    }
    if (this.tab() === 'branches') {
      this.api.getBranchPnl(this.selectedMonth).then(r => {
        this.branchPnl.set(r.branches ?? []);
        this.branchTotals.set(r.totals ?? null);
      }).catch(() => {});
    }
    if (this.tab() === 'medicine') {
      this.api.getMedicineRevenue({ from: this.medicineFrom || undefined, to: this.medicineTo || undefined, storeId: this.storeFilter || undefined })
        .then(r => this.medicine.set(r)).catch(() => {});
    }
    if (this.tab() === 'clinic-expenses') {
      this.api.getExpenses({ level: 'CLINIC' }).then(r => this.clinicExpenses.set(r.expenses)).catch(() => {});
    }
    if (this.tab() === 'store-expenses') {
      this.api.getExpenses({ level: 'STORE', storeId: this.storeFilter || undefined }).then(r => this.storeExpenses.set(r.expenses)).catch(() => {});
    }
  }

  openExpenseModal(expense?: any, level: 'CLINIC' | 'STORE' = 'CLINIC'): void {
    if (expense) {
      this.editingExpense.set(expense);
      this.expenseForm = {
        level: expense.level,
        storeId: expense.storeId ?? '',
        category: expense.category,
        description: expense.description,
        vendor: expense.vendor ?? '',
        billNo: expense.billNo ?? '',
        amountInPaise: expense.amountInPaise,
        expenseDate: expense.expenseDate.slice(0, 10)
      };
    } else {
      this.editingExpense.set(null);
      this.expenseForm = { ...EMPTY_EXPENSE_FORM, level, storeId: level === 'STORE' ? (this.storeFilter || '') : '' };
    }
    this.expenseModal.set(true);
  }

  closeExpenseModal(): void {
    this.expenseModal.set(false);
    this.editingExpense.set(null);
  }

  saveExpense(): void {
    const amountInPaise = Math.round(Number(this.expenseForm.amountInPaise));
    if (!this.expenseForm.description || !amountInPaise) return;

    const payload = {
      ...this.expenseForm,
      amountInPaise,
      storeId: this.expenseForm.level === 'STORE' ? this.expenseForm.storeId : null
    };

    const req = this.editingExpense()
      ? this.api.updateExpense(this.editingExpense()!.id, payload)
      : this.api.createExpense(payload);

    req.then(() => {
      this.closeExpenseModal();
      this.loadAll();
      this.toast.set('Expense saved');
      setTimeout(() => this.toast.set(''), 2500);
    }).catch(() => this.toast.set('Save failed'));
  }

  deleteExpense(id: string): void {
    if (!confirm('Delete this expense?')) return;
    this.api.deleteExpense(id).then(() => {
      this.loadAll();
      this.toast.set('Expense deleted');
      setTimeout(() => this.toast.set(''), 2500);
    });
  }

  async exportBundle(): Promise<void> {
    this.exporting.set(true);
    try {
      const csv = await this.api.exportAccountantBundle({
        month: this.selectedMonth,
        storeId: this.branchExportFilter || undefined
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const suffix = this.branchExportFilter ? `-${this.branchExportFilter}` : '';
      anchor.download = `accountant-bundle-${this.selectedMonth}${suffix}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.toast.set('Accountant bundle exported');
      setTimeout(() => this.toast.set(''), 2500);
    } catch {
      this.toast.set('Export failed');
      setTimeout(() => this.toast.set(''), 2500);
    } finally {
      this.exporting.set(false);
    }
  }
}
