import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/services/admin-api';
import type {
  AdminPaymentEvent,
  AdminPaymentRefund,
  AdminPaymentSummary,
} from '../../../core/services/admin/admin-reports.api';
import {
  formatPaise,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_STATUS_STYLES,
  PAYMENTS_PAGE_SIZE,
} from '../constants/payment-status.constants';

@Component({
  selector: 'app-payments-page',
  imports: [FormField, DatePipe],
  templateUrl: './payments-page.html',
  styleUrl: './payments-page.scss',
})
export class PaymentsPage implements OnInit {
  private api = inject(AdminApi);

  payments = signal<any[]>([]);
  summary = signal<AdminPaymentSummary>({
    total: 0,
    paid: 0,
    refunded: 0,
    netPaid: 0,
    failedCount: 0,
    pendingCount: 0,
  });
  loading = signal(true);
  error = signal('');
  page = signal(1);
  pageSize = PAYMENTS_PAGE_SIZE;
  total = signal(0);
  statusFilter = signal('ALL');
  toast = signal('');
  exporting = signal(false);
  selectedPayment = signal<any | null>(null);
  selectedEvents = signal<AdminPaymentEvent[]>([]);
  selectedRefunds = signal<AdminPaymentRefund[]>([]);
  detailsLoading = signal(false);
  detailsError = signal('');
  refundAmountRupees = signal('');
  refundReason = signal('');
  refundSpeed = signal<'normal' | 'optimum'>('normal');
  refundCancelConsultation = signal(false);
  refundSubmitting = signal(false);

  readonly dateFilterModel = signal({ from: '', to: '' });
  readonly dateFilterForm = form(this.dateFilterModel);

  readonly statusOptions = PAYMENT_STATUS_OPTIONS;
  readonly statusStyles = PAYMENT_STATUS_STYLES;
  readonly formatPaise = formatPaise;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const dates = this.dateFilterModel();
    this.api
      .getPayments({
        page: this.page(),
        pageSize: this.pageSize,
        status: this.statusFilter() as any,
        from: dates.from || undefined,
        to: dates.to || undefined,
      })
      .then((r) => {
        this.payments.set(r.payments);
        this.summary.set(r.summary);
        this.total.set(r.pagination?.total ?? r.payments.length);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load payments. Please try again.');
        this.payments.set([]);
        this.loading.set(false);
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.statusFilter.set('ALL');
    this.dateFilterModel.set({ from: '', to: '' });
    this.applyFilters();
  }

  setStatus(value: string): void {
    this.statusFilter.set(value);
    this.applyFilters();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  async exportCsv(): Promise<void> {
    this.exporting.set(true);
    this.toast.set('');
    const dates = this.dateFilterModel();
    try {
      const csv = await this.api.exportPaymentsCsv({
        status: this.statusFilter() as any,
        from: dates.from || undefined,
        to: dates.to || undefined,
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.set('CSV exported');
    } catch {
      this.toast.set('Export failed. Please try again.');
    } finally {
      this.exporting.set(false);
      setTimeout(() => this.toast.set(''), 2500);
    }
  }

  async openDetails(payment: any): Promise<void> {
    this.selectedPayment.set(payment);
    this.selectedEvents.set([]);
    this.selectedRefunds.set([]);
    this.detailsError.set('');
    this.resetRefundForm(payment);
    this.detailsLoading.set(true);
    try {
      const result = await this.api.getPaymentEvents(payment.id);
      this.selectedEvents.set(result.events || []);
      this.selectedRefunds.set(result.refunds || []);
    } catch {
      this.detailsError.set('Could not load gateway events.');
    } finally {
      this.detailsLoading.set(false);
    }
  }

  closeDetails(): void {
    this.selectedPayment.set(null);
    this.selectedEvents.set([]);
    this.selectedRefunds.set([]);
    this.detailsError.set('');
  }

  canRefund(payment: any): boolean {
    const status = String(payment?.status || '');
    return (
      !!payment?.providerPaymentId &&
      (status === 'PAID' || status === 'PARTIALLY_REFUNDED') &&
      this.refundableAmount(payment) > 0
    );
  }

  refundableAmount(payment: any): number {
    return Math.max(
      0,
      Number(payment?.amountInPaise || 0) - Number(payment?.refundedAmountInPaise || 0),
    );
  }

  balanceDueInPaise(payment: any): number {
    return Number(payment?.lineItems?.balanceDueInPaise || 0);
  }

  packageUsage(payment: any) {
    return payment?.lineItems?.packageUsage || null;
  }

  onRefundAmountInput(event: Event): void {
    this.refundAmountRupees.set((event.target as HTMLInputElement).value);
  }

  onRefundReasonInput(event: Event): void {
    this.refundReason.set((event.target as HTMLTextAreaElement).value);
  }

  onRefundSpeedChange(event: Event): void {
    this.refundSpeed.set((event.target as HTMLSelectElement).value as 'normal' | 'optimum');
  }

  onRefundCancelChange(event: Event): void {
    this.refundCancelConsultation.set((event.target as HTMLInputElement).checked);
  }

  async submitRefund(): Promise<void> {
    const payment = this.selectedPayment();
    if (!payment || !this.canRefund(payment) || this.refundSubmitting()) return;

    const amountText = this.refundAmountRupees().trim();
    const reason = this.refundReason().trim();
    if (!reason) {
      this.toast.set('Refund reason is required.');
      setTimeout(() => this.toast.set(''), 2500);
      return;
    }

    const parsedAmountInPaise = amountText ? Math.round(Number(amountText) * 100) : null;
    if (amountText && (!Number.isFinite(parsedAmountInPaise) || (parsedAmountInPaise ?? 0) < 100)) {
      this.toast.set('Enter a refund amount of at least ₹1.');
      setTimeout(() => this.toast.set(''), 2500);
      return;
    }
    const amountInPaise = parsedAmountInPaise ?? undefined;

    this.refundSubmitting.set(true);
    this.toast.set('');
    try {
      const result = await this.api.refundPayment(payment.id, {
        ...(amountInPaise ? { amountInPaise } : {}),
        reason,
        speed: this.refundSpeed(),
        cancelConsultation: this.refundCancelConsultation(),
      });
      this.toast.set('Refund initiated and tracked.');
      this.load();
      await this.openDetails({ ...payment, ...result.payment });
    } catch (error: any) {
      this.toast.set(error?.error?.message || error?.message || 'Refund failed.');
    } finally {
      this.refundSubmitting.set(false);
      setTimeout(() => this.toast.set(''), 3000);
    }
  }

  private resetRefundForm(payment: any): void {
    const refundable = this.refundableAmount(payment);
    this.refundAmountRupees.set(refundable ? String(refundable / 100) : '');
    this.refundReason.set('');
    this.refundSpeed.set('normal');
    this.refundCancelConsultation.set(false);
  }
}
